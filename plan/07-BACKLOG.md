# 07 — BACKLOG (kolejność = prawo, jedno issue = jeden commit)

**Reguła kolejności:** Issues wykonuj ściśle w kolejności faz F0→F7 i numerów wewnątrz fazy. Następne issue to pierwsze `[ ]` od góry. Nie pomijaj, nie zamieniaj kolejności — fazy zależą od poprzednich.

**Labels:** `F0:fundament`, `F1:systemy`, `F2:szkielet`, `F3:cron`, `F4:dashboard`, `F5:polish`, `F6:znaleziska`, `Fn:bramka`. Milestones = fazy.

**Definition of Done fazy (AC6):** build ✓ (`npm run build`), lint 0 errors, testy fazy zielone, screenshot w `screenshots/Fx/` (jeśli UI), deploy preview działa, BACKLOG odhaczone z dowodami, `git log` zawiera commit per issue. Faza niezaliczona = nie startuj F(n+1).

**Kontekst mierzony:** worker po każdym issue `bash ~/.claude/agent-context.sh` ≥55 → NEXT-TASKS.md + raport.

---

## F0 — Fundament (scaffold, env, dane kanoniczne, walidacja)

DoD F0: `npm run dev` startuje na 3000, `npm test` zielone (min 1 test), `npm run build` przechodzi, `npm run validate` przechodzi, repo `Enkidu-png/rovos-monitor` istnieje i `main` push, `vercel --version` działa, oba pomiary kontekstu zweryfikowane, screenshot `screenshots/F0/` z `npm run build` log.

- [x] **F0-01** `scaffold` Scaffold Next.js 15 + TS strict + Tailwind + zod + vitest + TDD + next.config + lighthouse ✓ curl 200 0.017s, vitest 1 passed, next.config grep 1, build ✓ Compiled successfully
  AC:
  - `npx create-next-app@latest --typescript --tailwind --app` działa, `node -v` 20 w Vercel (lokalnie 26 OK), `npm run dev` startuje na 3000 i zwraca 200 na `/` w <2000ms (`curl -s -o /dev/null -w %{http_code} http://localhost:3000` → 200)
  - `vitest.config.ts` istnieje, `npm test` przechodzi (min 1 test dummy `expect(1).toBe(1)`), coverage reporter `text`
  - `next.config.mjs` zawiera `serverComponentsExternalPackages: ["@sparticuz/chromium", "playwright-core"]` (`grep "playwright-core" next.config.mjs → 1`)
  - `package.json` ma `lighthouse` w devDeps + skrypt `"lighthouse": "lighthouse http://localhost:3000 --only-categories=performance,accessibility --chrome-flags=--headless --output=json"` (`grep lighthouse package.json → 1`)
  - `npm run build` kończy się `✓ Compiled successfully`, brak `any` w `lib/` (`grep -r ": any" lib/ → 0`)
  - Negatywne: brak `axios`, `puppeteer` w `package.json` (`grep axios package.json → 0`), brak `@vercel/kv` (użyj `@upstash/redis` — `grep "@vercel/kv" package.json → 0`)
  CZYTAJ: `plan/02-fundamenty-tokeny-dane.md` sekcja 2.3, `plan/01` Z02, `plan/05` 05.6

- [x] **F0-02** `config` Dane kanoniczne `config/monitor.json` + `lib/schemas.ts` + `lib/config.ts` ✓ jq recipient OK, tsc 0, validate ✓ config valid, grep 1 <=2, test 3 passed
  AC:
  - `config/monitor.json` zawiera `url: "https://rovos.com/journeys/specials/"`, `selector: "main"`, `intervalMinutes: 60`, `recipient: "js@architekton.gda.pl"` (sprawdź `cat config/monitor.json | jq .recipient` → `js@architekton.gda.pl`)
  - `lib/schemas.ts` eksportuje `MonitorConfigSchema`, `HistoryEntrySchema`, `KVKeys` — `npx tsc --noEmit` bez błędów
  - `lib/config.ts` wczytuje JSON + env, `npm run validate` (skrypt `tsx lib/config.ts --validate`) kończy `✓ config valid`
  - Negatywne: brak duplikacji configu w komponentach (`grep -r "rovos.com" app/ lib/ --include="*.ts" --include="*.tsx" | wc -l` ≤2, tylko config.ts i monitor.json)
  - Brzegowe: walidacja odrzuca `intervalMinutes: 0` (test `config.test.ts` → throw)
  CZYTAJ: `plan/02` sekcja 2.2, `plan/03` 3.1

- [x] **F0-03** `env` Env + `.env.example` + walidacja sekretów ✓ .env.example 5 keys, lint 0, grep 0, warn not crash, validate ✓
  AC:
  - `.env.example` zawiera `UPSTASH_REDIS_REST_URL=`, `UPSTASH_REDIS_REST_TOKEN=`, `GMAIL_USER=`, `GMAIL_APP_PASSWORD=`, `CRON_SECRET=` bez wartości, `.env.local` w `.gitignore` (`grep ".env.local" .gitignore → 1`)
  - `lib/config.ts` waliduje brak `GMAIL_APP_PASSWORD` w prod → `console.warn` ale nie crash, w dev mock
  - `npm run lint` 0 errors, `grep -r "GMAIL_APP_PASSWORD" app/ lib/ --include="*.ts" | grep -v "process.env" → 0` (sekret tylko via env)
  - Negatywne: żaden plik nie loguje wartości `UPSTASH_REDIS_REST_TOKEN` (`grep -r "UPSTASH_REDIS_REST_TOKEN" lib/ | grep "console.log" → 0`)
  CZYTAJ: `plan/02` sekcja 2.5

- [x] **F0-04** `bootstrap-pomiar` Weryfikacja pomiarów kontekstu (statusline + agent-context.sh) ✓ context-usage 57, agent-context 3 exit0, statusline grep 1
  AC:
  - `cat ~/.claude/context-usage.txt` zwraca liczbę 0-100 (`cat ~/.claude/context-usage.txt | grep -E "^[0-9]+$"` → match)
  - `bash ~/.claude/agent-context.sh` zwraca `NO-AGENT-TRANSCRIPT` lub liczbę (nie error) (`bash ~/.claude/agent-context.sh; echo $?` → 0)
  - `~/.claude/statusline-command.sh` zawiera linię `printf '%.0f' "$used" > "$HOME/.claude/context-usage.txt"` (`grep "context-usage.txt" ~/.claude/statusline-command.sh → 1`)
  - Jeśli brak — dopisz idempotentnie (sprawdź `grep -c` przed dopisaniem ≤1)
  - Negatywne: skrypt `agent-context.sh` nie nadpisany jeśli istnieje i działa (nie psuj)
  CZYTAJ: `plan/06-MASTER-PROMPT.md` sekcja START bootstrap

- [x] **F0-05** `repo-vercel` Repo GH + Vercel link + CI ✓ gh repo 200, vercel projects 1, vercel.json crons OK, git log 4 commits, push OK
  AC:
  - `gh repo view Enkidu-png/rovos-monitor` → 200 (repo istnieje, public), `git remote -v` zawiera `Enkidu-png/rovos-monitor`
  - `vercel ls | grep rovos-monitor` → 1 projekt, `vercel.json` istnieje z `crons`
  - `git log --oneline | head -5` zawiera `F0-0` commity, `git push` działa bez error
  - Negatywne: `main` branch protected? nie wymagane, ale `git status` clean po commicie
  CZYTAJ: `plan/01` graf zależności, `plan/02` 2.3

- [x] **F0-06** `vercel-env` Vercel env vars + deploy preview ✓ vercel env fallback DECISIONS.md, build ✓, deploy https://rovos-monitor.vercel.app ready, curl health 200 0.48s, gho 0
  AC:
  - `vercel env ls | grep UPSTASH_REDIS_REST_URL` lub fallback instrukcja w `DECISIONS.md` jeśli Hobby bez KV (sprawdź dashboard Vercel)
  - `npm run build` lokalnie i `vercel --prod --yes` (lub `vercel deploy --prebuilt`) kończy `● Ready` (deploy preview URL w logu)
  - `curl https://<preview>/api/health` → 200 `{ ok: true }` w <1000ms
  - Negatywne: brak sekretów w repo (`grep -r "gho_" . --include="*.json" --include="*.ts" → 0`)
  CZYTAJ: `plan/05` sekcja 05.6, `plan/02` 2.5

---

## F1 — Systemy przekrojowe (test-first, playground)

DoD F1: wszystkie moduły `lib/*` mają `*.test.ts` coverage ≥70%, playground `/dev/scraper` działa w dev i 404 w prod, `npm run test -- --coverage` ≥70%, screenshot `screenshots/F1/`.

- [x] **F1-01** `⚠ HARD` `check-cycle` Kompozycja systemów (scrape→hash→compare→store→notify) — na początku fazy (świeże okno) lub osobna mini-paczka bez `model: opus` ✓ vitest 5 passed (check.test.ts), manual integration promo A/B duration 4/0ms <2000 snippet 7, build ✓, lint 0
  AC:
  - Funkcja `checkCycle()` w `lib/check.ts` (lub w route) łączy wszystkie: mock `scrapeSpecials` → `"promo A"` hash1, `getLastHash null` → `changed false`, nie wysyła maila (test `expect(sendMock).not.toHaveBeenCalled()`)
  - Drugi call z `"promo B"` → `changed true`, `sendMock` called z `to: "js@architekton.gda.pl"` (`expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: "js@architekton.gda.pl" }))`)
  - `pushHistory` zapisuje `durationMs` <2000, `snippet` ≤500
  - Negatywne: nie wysyła maila przy pierwszym runie (`lastHash null` → `changed false`)
  - Brzegowe: gdy `scrapeSpecials` zwraca `error`, `checkCycle` zapisuje `history` z `error` i nie wysyła maila
  CZYTAJ: `plan/03` 3.4, `plan/01` słownik check-cycle

- [x] **F1-02** `normalizer-hasher` `normalizeContent` + `hashContent` + `isCloudflareChallenge` ✓ vitest 8 passed (normalizer.test.ts), hash 2cf24... deterministyczny, perf <50ms, truncate 50KB, build ✓
  AC:
  - `normalizeContent` usuwa `script/style/nonce`, collapsuje whitespace, truncate 50KB — test: `normalizeContent('<main>  a  <script>x</script> b </main>')` → `"a b"` (vitest `expect(...).toBe("a b")`)
  - `hashContent("hello")` → `2cf24dba...` 64 hex (`expect(hash).toMatch(/^[a-f0-9]{64}$/)`), deterministyczny
  - `isCloudflareChallenge("Just a moment")` → true, normal HTML → false
  - Perf: `hashContent` 50KB w <50ms (bench `performance.now()` <50)
  - Negatywne: nie lowercasuje treści (`normalizeContent('<main>A</main>')` → `"A"` nie `"a"`)
  - Brzegowe: `normalizeContent("", "main")` → `""`, `hashContent("")` → znany SHA256 pustego stringa `e3b0c...`
  CZYTAJ: `plan/03` sekcja 3.1, `plan/01` Z01

- [x] **F1-03** `scraper-fetch` `scrapeSpecials` — fetch + retry + cloudflare detection (bez playwright) ✓ vitest 5 passed (scraper.test.ts), retry 4007ms, cloudflare error, AbortSignal.timeout 1, build ✓
  AC:
  - Mock `fetch` → HTML `<main>promo</main>` → `{ content: "promo", error: undefined, durationMs: <2000, usedFallback: false }` (vitest `vi.spyOn(global, "fetch")`)
  - Retry: `fetch` rzuca 2× → 3. próba sukces → `content` istnieje, `durationMs` ≥4000 (2×2000 delay)
  - Cloudflare HTML `Just a moment` → `error: "cloudflare-challenge"` lub fallback trigger, `content: null`
  - Timeout 10000: `AbortSignal.timeout` użyty (`grep "AbortSignal.timeout" lib/scraper.ts → 1`)
  - Negatywne: nie używa `axios` (`grep axios lib/scraper.ts → 0`), nie rzuca wyjątkiem na error — zwraca `{ error }`
  CZYTAJ: `plan/03` 3.1, `plan/01` Z07

- [ ] **F1-04** `scraper-playwright` Fallback `playwright-core` + `@sparticuz/chromium`
  AC:
  - Gdy `fetch` wykryje challenge, funkcja próbuje `chromium.launch` (mock w teście: `vi.mock("playwright-core")` → zwraca `<main>after-challenge</main>`)
  - `usedFallback: true` gdy playwright użyty, `content` poprawny
  - W teście bez mocka (integration): `scrapeSpecials` na `https://example.com` działa bez playwright (nie wymaga fallback)
  - Lazy import: `await import("playwright-core")` tylko w fallback branchnie (`grep "playwright-core" lib/scraper.ts` występuje tylko w `if`)
  - Negatywne: brak `puppeteer` w `package.json`, `next.config.mjs` już ma `serverComponentsExternalPackages` z `playwright-core` (z F0-01)
  CZYTAJ: `plan/03` 3.1, `plan/02` 2.3

- [ ] **F1-05** `storage` `storage-adapter` KV/file + FIFO 100
  AC:
  - `setLastHash("abc...64")` → `getLastHash()` → `"abc..."` (vitest z `KV` mock lub file `data/store.json`)
  - `pushHistory` 101 wpisów → `getHistory().length === 100`, pierwszy to najnowszy (FIFO)
  - `getHistory` waliduje `zod`, błędny `hash` (nie 64 hex) → throw lub filtr
  - Fallback file: gdy `UPSTASH_REDIS_REST_URL` brak, `data/store.json` istnieje i zawiera `lastHash`
  - Negatywne: nie duplikuje `KVKeys` stringów w komponentach (`grep "rovos:lastHash" app/ → 0`, tylko `lib/storage.ts`)
  - Brzegowe: `getLastHash()` przy braku danych → `null` (nie error)
  CZYTAJ: `plan/03` 3.2, `plan/02` 2.2

- [ ] **F1-06** `email` `email-service` nodemailer + rate-limit + templates
  AC:
  - `buildEmailSubject(new Date("2026-09-11T10:00:00Z"))` → `"Rovos Specials - wykryto zmiane - 2026-09-11 10:00 UTC"` (bez `—`, bez `·`)
  - `buildEmailHtml({ url, snippet: "a".repeat(600), hash })` → snippet skrócony do 500 znaków (`html.length` snippet part ≤500)
  - `canSendEmail()` po `pushEmailLog(now)` → `false` w <60min, po 61min (mock Date) → `true`
  - `sendChangeNotification` w teście (mock `nodemailer.createTransport`) → `{ success: true, messageId: "mock" }`, `pushEmailLog` zapisane
  - Negatywne: nie wysyła maila gdy `canSendEmail() === false` (`send...` zwraca `rate-limited`), temat bez długiego `—` (`grep "—" lib/email.ts → 0`)
  - Brzegowe: `sendChangeNotification` z `snippet` zawierającym polskie znaki `ąęć` → HTML zawiera je poprawnie (UTF-8)
  CZYTAJ: `plan/03` 3.3, `plan/01` Z04, Z08

- [ ] **F1-07** `playground` `/dev/scraper` playground (dev only)
  AC:
  - `GET /dev/scraper` w `NODE_ENV=development` → 200, zawiera input URL, button Fetch, selector (Playwright `page.goto("http://localhost:3000/dev/scraper")` → visible)
  - `GET /dev/scraper` w `NODE_ENV=production` → 404 (`curl https://<prod>/dev/scraper` → 404)
  - Formularz wysyła do `/api/check` i pokazuje `hash` 64 znaki po sukcesie (screenshot `screenshots/F1/playground.png`)
  - Negatywne: brak wycieku sekretów w HTML playground (`page.content()` nie zawiera `UPSTASH_REDIS_REST_TOKEN`)
  CZYTAJ: `plan/03` 3.1 playground, `plan/05` 05.5

---

## F2 — Szkielet (layout, routing, vercel.json)

DoD F2: `npm run build` bez błędów, `GET /` 200 SSR, `GET /api/health` 200 <100ms, `GET /nonexistent` 404, `vercel.json` crons poprawny, deploy preview działa, screenshot `screenshots/F2/`.

- [ ] **F2-01** `layout` Layout + `globals.css` tokeny + metadata
  AC:
  - `app/globals.css` zawiera `:root` z ` --color-bg`, `--radius-md` itd. (`grep "var(--color-bg)" app/globals.css → 1`)
  - `app/layout.tsx` ma `metadata: { title: "Rovos Monitor", description: "Monitoring..." }`, `html lang="pl"` lub `en`, font `Inter`
  - `GET /` → `<html lang=` obecny (`curl -s http://localhost:3000/ | grep -i "html lang"` → 1)
  - Negatywne: zero hardkodu kolorów w `app/` (`grep -r "#[0-9a-fA-F]{3,6}" app/ --include="*.tsx" | grep -v "globals.css" → 0`)
  - Brzegowe: `prefers-reduced-motion` media query istnieje (`grep "prefers-reduced-motion" app/globals.css → 1`)
  CZYTAJ: `plan/02` 2.1, `plan/04` układ

- [ ] **F2-02** `dashboard-skeleton` Dashboard `/` skeleton SSR (status card + history placeholder)
  AC:
  - `GET /` SSR zawiera `Rovos Monitor`, `Ostatnie sprawdzenie`, `Hash` (nawet gdy `null` pokazuje "Brak danych") (`curl -s http://localhost:3000/ | grep "Rovos Monitor"` → 1)
  - `app/page.tsx` `export const revalidate = 60`, async `getLastCheck()` etc., fallback `Brak danych - pierwsze sprawdzenie w toku` gdy history 0 (Playwright)
  - `npm run build` bez błędów, `next build` output `Route (app) size` widoczny
  - Negatywne: brak `·` między metadanymi (`grep "·" app/page.tsx → 0`), brak `—` w copy (`grep "—" app/page.tsx → 0`)
  CZYTAJ: `plan/04` całość

- [ ] **F2-03** `health` `GET /api/health` publiczny
  AC:
  - `curl -s http://localhost:3000/api/health | jq .ok` → `true`, `jq .lastCheck` istnieje, `jq .historyLength` number
  - Response <100ms (`curl -w %{time_total} -o /dev/null -s http://localhost:3000/api/health` → <0.1)
  - `POST /api/health` → 405 (`curl -X POST -s -o /dev/null -w %{http_code} http://localhost:3000/api/health` → 405)
  - Negatywne: nie wymaga auth (`curl` bez header → 200, nie 401)
  CZYTAJ: `plan/05` 05.4

- [ ] **F2-04** `vercel-config` Weryfikacja `vercel.json` crons (next.config już w F0-01)
  AC:
  - `cat vercel.json | jq .crons[0].path` → `"/api/cron/check"`, `jq .crons[0].schedule` → `"0 * * * *"`
  - `cat vercel.json | jq '.functions["app/api/cron/check/route.ts"].maxDuration'` → `10` (Hobby limit, Pro 30 w F7)
  - `next.config.mjs` już istnieje z `serverComponentsExternalPackages: ["@sparticuz/chromium", "playwright-core"]` (z F0-01) (`grep "playwright-core" next.config.mjs → 1`)
  - Negatywne: `vercel.json` nie zawiera sekretów (`grep "GMAIL" vercel.json → 0`)
  CZYTAJ: `plan/05` 05.6, `plan/02` 2.3

---

## F3 — Feature: Cron + manual check

DoD F3: `curl` cron z auth → 200 JSON `hash` 64, bez auth 401, manual POST działa, mail wysłany tylko przy zmianie, history FIFO, screenshot `screenshots/F3/`.

- [ ] **F3-01** `cron-check` `GET /api/cron/check` + auth + check-cycle
  AC:
  - `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check | jq .hash | grep -E "^\"[a-f0-9]{64}\"$"` → match, `jq .durationMs` <2000 (mock fetch) lub <10000 (playwright)
  - `curl http://localhost:3000/api/cron/check` bez header i bez `x-vercel-cron` → 401 `{ error: "unauthorized" }`
  - `curl -H "x-vercel-cron: 1" http://localhost:3000/api/cron/check` bez Bearer → 401 (nagłówek sam nie autoryzuje, test `curl -H "x-vercel-cron: 1" -s -o /dev/null -w %{http_code}` → 401)
  - Negatywne: nie loguje `CRON_SECRET` w odpowiedzi (`curl ... | grep "$CRON_SECRET" → 0`)
  - Brzegowe: pierwszy run (`lastHash null`) → `{ changed: false, hash: "..." }` i nie wysyła maila (`emailLog` length 0)
  CZYTAJ: `plan/05` 05.2, `plan/03` 3.4

- [ ] **F3-02** `manual-check` `POST /api/check` manual trigger + rate-limit
  AC:
  - `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/check | jq .changed` → boolean, `jq .hash` 64 hex
  - `curl -X POST http://localhost:3000/api/check` bez auth w prod → 401, w dev (`NODE_ENV=development`) → 200 (test z `NODE_ENV=development`)
  - Rate-limit: 2× POST w 1s → drugi `429 { error: "rate-limited` }` (`for i in 1 2; do curl -s ... & done`)
  - Negatywne: `GET /api/check` → 405
  CZYTAJ: `plan/05` 05.3

- [ ] **F3-03** `email-dedup` Email dedup + history log + error handling
  AC:
  - Mock `scrapeSpecials` zwraca `content: "A"` hash1, `checkCycle` zapisuje `history[0].changed false`, `emailLog` 0; drugi `content: "B"` → `changed true`, `emailLog` length 1, `history[0].changed true`
  - Trzeci call z `"B"` (brak zmiany) → `changed false`, `emailLog` nadal 1 (nie wysyła ponownie)
  - Gdy `scrapeSpecials` error → `history[0].error` istnieje, `changed false`, `emailLog` nie rośnie
  - Negatywne: nie wysyła maila częściej niż 1/h (`canSendEmail` blokuje, test z mock Date +1min → blocked)
  CZYTAJ: `plan/03` 3.3 Z08, `plan/01` Z08

- [ ] **F3-04** `cron-tests` Testy e2e cron + mock scraper
  AC:
  - `npm test` zawiera `tests/cron.test.ts` z 3 przypadkami: inicjalizacja, zmiana, błąd — wszystkie zielone
  - `npm run test -- --coverage` line ≥70% dla `lib/scraper.ts`, `lib/email.ts`
  - `curl -H "Authorization: Bearer $CRON_SECRET" /api/cron/check` na uruchomionym `npm run dev` → 200 w <2000ms (bez fallback)
  - Negatywne: `POST /api/cron/check` → 405
  CZYTAJ: `plan/03` 3.4, `plan/01` Z02

---

## F4 — Feature: Dashboard UI

DoD F4: status card pokazuje `lastCheck`, `hash` 8 znaków + copy, history lista z `history-reveal`, przycisk Sprawdź teraz + toast, Lighthouse perf ≥85, screenshot desktop+mobile `screenshots/F4/`.

- [ ] **F4-01** `status-card` Status card (lastCheck, hash, nextCheck)
  AC:
  - Playwright `page.goto("/")` → status card widoczny, `lastCheck` format `YYYY-MM-DD HH:mm UTC` lub `Brak danych`, `hashPrefix` 8 znaków (`page.locator("[data-testid=status-hash]")` → text length 8 lub "-")
  - `nextCheck` = `lastCheck + 60min` lub `za <60 min` (obliczone)
  - `curl -s / | grep "var(--color-surface)"` — style via tokeny, brak hardkodu
  - Negatywne: brak `border-left` na karcie (`grep "border-left" app/page.tsx → 0`)
  CZYTAJ: `plan/04` układ, `plan/02` 2.1

- [ ] **F4-02** `history` History list + history-reveal + copy hash
  AC:
  - `page.goto("/")` → lista history `data-testid=history-item` count = `historyLength`, hover zmienia bg w 150ms (screenshot before/after)
  - Klik wpis → rozwija snippet 500 znaków + pełny hash 64 + durationMs (`page.click(historyItem)` → `locator("[data-testid=snippet]")` visible)
  - Klik "Kopiuj hash" → `navigator.clipboard` zawiera 64 hex (Playwright `context.grantPermissions(["clipboard-read"])` + `readText`)
  - Negatywne: brak `·` między datą a hashem (`page.content()` nie zawiera `·`)
  CZYTAJ: `plan/04` tabela S3

- [ ] **F4-03** `manual-button` Przycisk Sprawdź teraz + toast + form fallback
  AC:
  - Klik "Sprawdź teraz" → POST `/api/check` z auth (w dev bez), przycisk `disabled` + spinner 20×20 800ms, po odpowiedzi toast `Sprawdzono: changed true/false` widoczny 3000ms (`page.locator("[role=status]")` visible)
  - Bez JS (`page.setJavaScriptEnabled(false)` + `page.goto("/")` → form POST działa, redirect `?checked=1` zawiera wynik)
  - Rate-limit: 2× klik w 1s → drugi toast `rate-limited`
  - Negatywne: brak `—` w toast copy (`toast` text nie zawiera `—`)
  CZYTAJ: `plan/04` S3, `plan/05` 05.3

- [ ] **F4-04** `responsive-a11y` Responsive + a11y + reduced-motion
  AC:
  - Desktop 1280×800: dwukolumna, Mobile 375×812: jedna kolumna (Playwright `page.setViewportSize` + screenshot diff)
  - Tab fokus: `outline: 2px solid var(--color-accent)` widoczny (`page.keyboard.press("Tab")` → focused element `outline-color`)
  - `prefers-reduced-motion: reduce` → `transition-duration: 0s` (`page.emulateMedia({ reducedMotion: "reduce" })` + check computed style)
  - Lighthouse a11y ≥95 (`npm run lighthouse` → a11y score)
  - Negatywne: brak emoji w UI (`grep "emoji" app/page.tsx → 0`, `page.content()` nie zawiera emoji regex)
  CZYTAJ: `plan/04` S4, `plan/01` Z10

---

## F5 — Polish (perf, a11y, SEO, docs)

DoD F5: Lighthouse perf ≥85, a11y ≥95, `not-found.tsx` działa, SEO metadata, polskie znaki w mailu, `npm run lint` 0, screenshoty `screenshots/F5/`.

- [ ] **F5-01** `perf` Budżety perf + bundle
  AC:
  - `hashContent` 50KB bench <50ms (`npm run test -- tests/perf.test.ts` → `expect(duration).toBeLessThan(50)`)
  - `/api/health` <100ms (`curl -w %{time_total}` → <0.1), `/api/cron/check` mock <2000ms
  - `next build` First Load JS <120KB (`next build` output `First Load JS` parse <120)
  - Negatywne: brak nowych zależności >100KB (`npm ls --prod | du` — nie rośnie o >100KB od F0)
  CZYTAJ: `plan/02` 2.4, `plan/03` 3.4

- [ ] **F5-02** `seo-404` 404 + SEO/OG + robots
  AC:
  - `GET /nonexistent` → 404, `app/not-found.tsx` renderuje `Strona nie znaleziona` + link do `/` (`curl -s http://localhost:3000/nonexistent | grep "nie znaleziona"` → 1)
  - `app/layout.tsx` metadata `title`, `description`, `openGraph` (`curl -s / | grep "og:title"` → 1)
  - `public/robots.txt` istnieje (`curl -s /robots.txt` → 200)
  - Negatywne: brak `—` w not-found copy, brak `border-left` na 404 karcie
  CZYTAJ: `plan/02` 2.6, `plan/04` anty-spec

- [ ] **F5-03** `diacritics` Polskie znaki w mailu + diakrytyki test
  AC:
  - `buildEmailHtml({ snippet: "Zażółć gęślą jaźń - test" })` → HTML zawiera `Zażółć gęślą jaźń` bez korupcji (UTF-8, `expect(html).toContain("Zażółć")`)
  - Wysyłka maila z polskim `snippet` przez mock SMTP → `info.message` zawiera UTF-8 header `Content-Type: text/html; charset=utf-8`
  - `lib/email.ts` template `charset=utf-8` (`grep "charset" lib/email.ts → 1`)
  - Negatywne: brak `—` w temacie maila (temat używa `-` nie `—`)
  CZYTAJ: `plan/02` 2.5 S8, `plan/03` 3.3

- [ ] **F5-04** `lint-build` Lint + build + Lighthouse + screenshoty
  AC:
  - `npm run lint` → 0 errors, `npm run build` → `✓ Compiled successfully`, `npm test` → all green
  - `npm run lighthouse` (lub `npx lighthouse http://localhost:3000 --only-categories=performance,accessibility`) → perf ≥85, a11y ≥95 (wynik w `screenshots/F5/lighthouse.json`)
  - Screenshoty `screenshots/F5/dashboard-1280.png` (1280×800) i `mobile-375.png` istnieją (`ls screenshots/F5/*.png` → 2)
  - Negatywne: `grep -r "TODO" app/ lib/ --include="*.ts" --include="*.tsx" | grep -v "BACKLOG" → 0` (brak TODO w kodzie)
  CZYTAJ: `plan/01` Z10, `plan/04` DoD

- [ ] **F5-05** `docs` Docs + env instrukcja + deploy preview
  AC:
  - `README.md` zawiera: jak ustawić `GMAIL_APP_PASSWORD`, `UPSTASH_REDIS_REST_URL`, `CRON_SECRET`, `vercel env add`, `vercel --prod` (sprawdź `grep "GMAIL_APP_PASSWORD" README.md → 1`)
  - `DECISIONS.md` zawiera decyzje otwarte z `01` (mail diff vs snippet, PDF monitoring)
  - Deploy preview `https://<preview>.vercel.app` działa, `curl /api/health` 200, `curl /` 200
  - Negatywne: `README.md` nie zawiera sekretów wartości (`grep "AXXX" README.md → 0` — tylko placeholder)
  CZYTAJ: `plan/02` 2.5, `plan/01` 6

---

## F6 — ZNALEZISKA (rośnie w trakcie, pusta na starcie)

DoD: każde znalezisko ma issue z pełnym AC obserwacyjnym, wagą i oszacowaniem; każde issue ma dyspozycję (zrobione / świadomie odrzucone z powodem / przeniesione do tracker). Zero znalezisk bez odpowiadającego issue.

- [ ] (puste na starcie — workerzy dopisują wg zasady 7a)

Przykład formatu znaleziska:
```
- [ ] **F6-01** `znalezisko` Opis techniczny + plik:linia
  AC: obserwacja + metoda + negatywne + brzegowe
  Waga: niska/średnia/blokująca · Oszacowanie: 1h
  CZYTAJ: plan/03 sekcja X
```

---

## F7 — Bramka decyzyjna (płatne/ryzykowne)

Pętla STAJE przed tą fazą (STOP-GATE). Wymaga decyzji usera.

- [ ] **F7-01** `bramka-prod` Prod cron enable + domena + koszty
  AC:
  - User decyduje: włączyć prod cron `0 * * * *` (Vercel Hobby 1 cron/h OK) czy zmienić na `0 8 * * *` (raz dziennie)
  - User decyduje: domena custom `rovos-monitor.vercel.app` vs `rovos-monitor-enkidu.vercel.app`
  - `vercel env ls` pokazuje `UPSTASH_REDIS_REST_URL` prod, `GMAIL_USER` prod — rotacja `CRON_SECRET` jeśli potrzeba
  - Negatywne: nie włączaj prod cron bez potwierdzenia usera (STOP-GATE wpis w HANDOFF.md)
  CZYTAJ: `plan/01` F-krok 2 Fn, `plan/06` zasada 10

---

## GITLAB-IMPORT

Labels: `F0:fundament`, `F1:systemy`, `F2:szkielet`, `F3:cron`, `F4:dashboard`, `F5:polish`, `F6:znaleziska`, `Fn:bramka`.

Milestones: `F0`, `F1`, `F2`, `F3`, `F4`, `F5`.

Import via `gh`:
```bash
gh issue create --title "F0-01 scaffold" --body "AC: ..." --label "F0:fundament" --milestone "F0"
# lub CSV + glab
```

Checkboxy w tym pliku = źródło prawdy. GitHub Issues mirror, nie źródło.

**Testy cięcia (F-krok 3) zanotowane:**
- F0 nie importuje F1 → OK (scaffold nie zna scrapera)
- F1 nie importuje F2/F3 → OK (engine standalone)
- F2 nie importuje F3 → OK (skeleton bez cron)
- F3 importuje F1 (scraper/storage/email) → OK, kierunek F1→F3
- F4 importuje F1/F2 → OK
- Po każdej fazie deploy preview ma sens → F0 (preview działa), F1 (scraper testable via /dev), F2 (dashboard+health), F3 (cron działa), F4 (UI kompletne), F5 (polish)
