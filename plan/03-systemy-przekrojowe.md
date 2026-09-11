# 03 — Systemy przekrojowe: scraper, hasher, storage, email

Każdy system ma: pseudokod/wzór ze stałymi (S2), strukturę plików, listę funkcji, budżety jako AC.

## 3.1 Scraper-engine (`lib/scraper.ts` + `lib/normalizer.ts`)

**Cel:** Pobrać znormalizowany kontent z `https://rovos.com/journeys/specials/` odpornie na Cloudflare.

**Struktura:**
```
lib/
  scraper.ts      # fetch + fallback
  normalizer.ts   # normalizeContent
  hasher.ts       # hashContent
```

**Funkcje eksportowane:**
```ts
// scraper.ts
export async function scrapeSpecials(url: string, opts?: { timeoutMs?: number }): Promise<{ content: string | null, error?: string, durationMs: number, usedFallback: boolean }>
// normalizer.ts
export function normalizeContent(html: string, selector?: string): string  // selector default "main"
export function isCloudflareChallenge(html: string): boolean
// hasher.ts
export function hashContent(normalized: string): string // SHA256 hex 64
```

**Algorytm scraper-engine (S2) — pseudokod z stałymi:**
```
const TIMEOUT = 10000 // Hobby maxDuration 10s
const RETRY = 3
const RETRY_DELAY = 2000
const FALLBACK_THRESHOLD = "Just a moment" || "cf-mitigated" || html.length < 1000

async scrapeSpecials(url):
  start = now()
  for attempt in 1..RETRY:
    try:
      html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "Accept": "text/html" }, signal: AbortSignal.timeout(TIMEOUT) }).then(r=>r.text())
      if isCloudflareChallenge(html):
        throw new Error("cloudflare-challenge")
      content = normalizeContent(html, selectorFromConfig)
      return { content, durationMs: now()-start, usedFallback: false }
    catch e:
      if attempt == RETRY: break
      await sleep(RETRY_DELAY)
      continue
  // fallback: playwright (tylko jeśli TIMEOUT nie przekroczony)
  try:
    browser = await chromium.launch({ executablePath: await chromium.executablePath() })
    page = await browser.newPage({ userAgent: "Mozilla/5.0" })
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: TIMEOUT })
    await page.waitForTimeout(3000) // czekaj na challenge solve (skrócone dla 10s limitu)
    html = await page.content()
    await browser.close()
    if isCloudflareChallenge(html): return { content: null, error: "cloudflare-still-blocked", durationMs: now()-start, usedFallback: true }
    content = normalizeContent(html, selector)
    return { content, durationMs: now()-start, usedFallback: true }
  catch e:
    return { content: null, error: e.message.slice(0,500), durationMs: now()-start, usedFallback: true }
```

**Normalizer — S2:**
```
normalizeContent(html, selector="main"):
  $ = cheerio.load(html)
  $("script, style, noscript, iframe, svg").remove()
  raw = $(selector).length ? $(selector).text() : $("body").text()
  // usuń cloudflare nonce, timestampy
  cleaned = raw.replace(/\b[a-f0-9]{32,}\b/g, "") // nonce
               .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*/g, "")
  collapsed = cleaned.replace(/\s+/g, " ").trim()
  truncated = collapsed.slice(0, 50000) // budżet 50KB
  return truncated
isCloudflareChallenge(html):
  return html.includes("Just a moment") || html.includes("cf-mitigated") || html.includes("challenges.cloudflare.com")
```

**Budżety (S1):**
- `normalizeContent` 50KB → <30 ms
- `hashContent` 50KB → <50 ms
- `scrapeSpecials` bez fallback → <2000 ms p95
- z fallback → <10000 ms (Hobby limit)

**Playground:** `app/dev/scraper/page.tsx` — input URL, przycisk Fetch, pokazuje `content.slice(0,2000)`, `hash`, `durationMs`, `usedFallback`, `error`. Tylko `NODE_ENV=development`, w prod `notFound()`.

---

## 3.2 Storage-adapter (`lib/storage.ts`)

**Cel:** Abstrakcja nad KV (prod) i file (dev/test). Jedno źródło prawdy Z05.

```ts
export async function getLastHash(): Promise<string | null>
export async function setLastHash(hash: string): Promise<void>
export async function getLastContent(): Promise<string | null>
export async function setLastContent(content: string): Promise<void>
export async function getLastCheck(): Promise<string | null>
export async function setLastCheck(iso: string): Promise<void>
export async function getHistory(): Promise<HistoryEntry[]>
export async function pushHistory(entry: HistoryEntry): Promise<void> // FIFO 100
export async function getEmailLog(): Promise<EmailLogEntry[]>
export async function pushEmailLog(entry: EmailLogEntry): Promise<void> // FIFO 50
```

**Algorytm pushHistory:**
```
pushHistory(entry):
  history = await kv.get(KV.history) ?? [] // lub file read, @upstash/redis: Redis.fromEnv().get()
  history.unshift(entry) // newest first
  if history.length > 100: history = history.slice(0,100)
  await kv.set(KV.history, history) // JSON auto, nie stringify ręcznie
```

**Implementacja:** `if (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) use @upstash/redis (Redis.fromEnv()) else use fs read/write data/store.json` (mutex via `fs` atomic write tmp+rename). Walidacja odczytu przez `zod`. `@vercel/kv` deprecated — używaj `@upstash/redis`.

**Budżet:** `get/set` <100 ms, `pushHistory` <150 ms.

---

## 3.3 Email-service (`lib/email.ts`)

```ts
export async function sendChangeNotification(opts: { to: string, url: string, snippet: string, hash: string, dashboardUrl?: string }): Promise<{ success: boolean, messageId?: string, error?: string }>
export async function canSendEmail(): Promise<boolean> // rate-limit check: <1/h
export function buildEmailSubject(date: Date): string // "Rovos Specials - wykryto zmiane - YYYY-MM-DD HH:mm UTC"
export function buildEmailHtml(opts): string
export function buildEmailText(opts): string
```

**Algorytm sendChangeNotification (S2):**
```
const RATE_LIMIT_MS = 60*60*1000
async sendChangeNotification(opts):
  if !await canSendEmail(): return { success: false, error: "rate-limited" }
  subject = buildEmailSubject(new Date())
  html = buildEmailHtml(opts) // zawiera url, snippet 500 znaków, hash 64, dashboard link, timestamp
  text = buildEmailText(opts)
  if process.env.NODE_ENV == "test": return mock
  transporter = nodemailer.createTransport({ service: "gmail", auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } })
  info = await transporter.sendMail({ from: GMAIL_USER, to: opts.to, subject, text, html })
  await pushEmailLog({ timestamp: new Date().toISOString(), to: opts.to, subject, success: true })
  return { success: true, messageId: info.messageId }

canSendEmail():
  log = await getEmailLog()
  if log.length == 0: return true
  last = log[0]
  return Date.now() - new Date(last.timestamp).getTime() > RATE_LIMIT_MS
```

**Szablon HTML (minimal, bez border-left Z04):**
```html
<div style="font-family:system-ui;max-width:600px;background:#fafaf7;padding:24px;border-radius:8px">
  <h1 style="font-size:18px;color:#0f4a3a">Wykryto zmiane na Rovos Specials</h1>
  <p>URL: <a href="{{url}}">{{url}}</a></p>
  <p>Hash: <code>{{hash}}</code></p>
  <p>Fragment: {{snippet}}</p>
  <p><a href="{{dashboardUrl}}">Zobacz dashboard</a></p>
  <p style="color:#6b6b6b;font-size:12px">{{timestamp}} UTC</p>
</div>
```

**Budżet:** `buildEmail*` <10 ms, `send` <2000 ms (SMTP).

---

## 3.4 Check-cycle — kompozycja systemów (używana w F3)

```
check-cycle:
  t0 = now()
  { content, error, durationMs, usedFallback } = await scrapeSpecials(config.url)
  if error || !content:
    await setLastCheck(nowISO())
    await pushHistory({ timestamp: nowISO(), hash: "", changed: false, error, durationMs })
    return { changed: false, error, durationMs }
  hash = hashContent(content)
  lastHash = await getLastHash()
  changed = lastHash !== null && hash !== lastHash
  await setLastContent(content)
  await setLastHash(hash)
  await setLastCheck(nowISO())
  await pushHistory({ timestamp: nowISO(), hash, changed, durationMs, snippet: content.slice(0,500) })
  if changed && await canSendEmail():
    await sendChangeNotification({ to: config.recipient, url: config.url, snippet: content.slice(0,500), hash, dashboardUrl: config.dashboardUrl })
  return { changed, hash, durationMs, usedFallback }
```

**Inicjalizacja (pierwszy run):** `lastHash === null` → `changed = false`, nie wysyłaj maila, tylko zapisz hash. To AC negatywne Z08.

---

## Checklist budżetów jako kryteria akceptacji (dla F1)

- [ ] `normalizeContent` 50KB → <30 ms (bench w `tests/normalizer.bench.ts`)
- [ ] `hashContent` 50KB → <50 ms
- [ ] `scrapeSpecials` mock `fetch` → <100 ms (bez sieci)
- [ ] `storage` FIFO 100 działa, `zod` walidacja odrzuca błędny hash
- [ ] `canSendEmail` blokuje drugi mail w <60 min
- [ ] `playground /dev/scraper` renderuje wynik w dev, 404 w prod
