# 01 — Analiza, zasady twarde, słownik pojęć

## 1. Analiza inputu — co podano i co zweryfikowano

| # | Źródło | Status otwarcia | Streszczenie (1-2 zdania) |
|---|--------|-----------------|----------------------------|
| 1 | `https://rovos.com/` (root) | Próba fetch → 403 Cloudflare challenge `Just a moment...` (cf-mitigated, 5390 B). `curl -A Mozilla/5.0` + iPhone UA nadal 403. WebFetch → 403. | Strona główna Rovos Rail za Cloudflare Bot Fight Mode. Wymaga headless browsera lub serwisu bypass. Nie da się monitorować prostym `fetch`. |
| 2 | `https://rovos.com/journeys/specials/` (cel monitoringu) | Jak wyżej — 403, `cf-mitigated: challenge`, `server: cloudflare`, `x-frame-options: SAMEORIGIN`. Body 5390–5560 B, tylko challenge JS. Playwright MCP dostępny, Vercel MCP ✔, Gmail MCP ✔. | Podstrona z ofertami specjalnymi. Zmiana = nowy/aktualizowany kafel oferty lub PDF. HTML po przejściu challenge zawiera listę `specials`. Trzeba scrapować po wyrenderowaniu JS. |
| 3 | SharePoint PDF `RVR Special_SANC.pdf` (hostingadminrovos-my.sharepoint.com) | `curl -I` → 403 prywatne, `p3p`, `x-sharepointhealthscore: 0`, wymaga logowania Microsoft. Niepubliczny. | Przykładowy PDF oferty. Pokazuje że oferty mogą być PDF-ami linkowanymi ze strony specials. Nie będziemy go scrapować bezpośrednio — link pojawi się na `/specials/`. |
| 4 | Wymagania tekstowe | Przeczytane w całości. | Aplikacja online (Vercel), monitoring zmiany na `/specials/`, mail na `js@architekton.gda.pl`, full TDD od zera, repo na GH `Enkidu-png/rovos-monitor`, sprawdzenie podłączeń Vercel/Context7/mail, samodzielne założenie kont serwisów jeśli potrzeba, ma działać bez obecności usera. |
| 5 | Środowisko lokalne | Zweryfikowane `bash` 2026-09-11. | `vercel 59.3.0` zalogowany jako `enkidu-png`, `gh` zalogowany jako `Enkidu-png` (scope repo, workflow), `node v26.7.0`, `npm 11.19.0`, `context7 ✔`, `vercel MCP ✔`, `gmail MCP ✔`, `playwright MCP ✔`, `resend 6.27.0` i `@sendgrid/mail 8.1.6` dostępne w npm, `~/.claude/agent-context.sh` istnieje, `statusline` zapisuje `context-usage.txt` (obecnie 57%). |

**Wnioski z analizy (systemowość):**
- Cloudflare wymusza architekturę scrapera z JS renderingiem — nie jest to zwykły `fetch` + `cheerio`. F1 musi zawierać silnik z fallbackiem: próba 1 = `fetch` z normalizacją, próba 2 = headless browser (`playwright-core` + `@sparticuz/chromium` na Vercel) lub zewnętrzny bypass API.
- PDF z SharePointa potwierdza że treść specials to oferty z załącznikami — diff musi ignorować `nonce`, `timestamp`, `cf-*` i porównywać znormalizowany kontent sekcji ofert.
- Gmail MCP jest podłączony lokalnie, ale Vercel cron nie ma dostępu do MCP — w produkcji potrzebny SMTP (Gmail App Password / OAuth2) lub Resend. Decyzja: Gmail SMTP (użytkownik wybrał Gmail MCP), Resend jako fallback udokumentowany w F0.

## 2. Typ projektu + stack (zweryfikowany, nie z domysłu)

**Typ:** Usługa monitoringu zmiany strony (change-detection service) z cronem, persystencją hasha i powiadomieniem email + minimalny dashboard statusu. Kategoria: `cron + scraper + notifier + dashboard`.

**Stack docelowy (kanoniczny):**
- Runtime: `Next.js 15.4.x` App Router, `TypeScript 5.6` strict, `Node 20` (Vercel default) — nie `Node 26` lokalnie, build na Vercel użyje 20.
- Styling: `Tailwind CSS 3.4`, tokeny CSS w `app/globals.css` — zakaz hardkodu w komponentach (zasada twarda Z03).
- Cron: `vercel.json` `crons: [{ path: "/api/cron/check", schedule: "0 * * * *" }]` (co 60 min) + `CRON_SECRET` w header `Authorization: Bearer`.
 - Storage: `@upstash/redis` (Vercel Redis, dawniej `@vercel/kv` — deprecated) — klucze `rovos:lastHash`, `rovos:lastContent`, `rovos:lastCheck`, `rovos:history` (lista do 100 wpisów). Env `UPSTASH_REDIS_REST_URL`/`TOKEN` (alias `KV_REST_API_URL` wspierany). Fallback lokalny: `data/store.json` dla dev/test.
- Scraping: `fetch` (undici) + `cheerio 1.0` do parsowania, `playwright-core 1.63` + `@sparticuz/chromium 143` jako fallback na Vercel (warunkowy import, by nie puchł bundle). Normalizacja HTML przed hash.
- Hash: `SHA256` znormalizowanego `textContent` sekcji `main` / `[data-specials]` / fallback `body`. `crypto` stdlib.
- Email: `nodemailer 6.9` z `service: gmail` (GMAIL_USER + GMAIL_APP_PASSWORD) — wysyłka na `js@architekton.gda.pl`. Alternatywa: `resend` jeśli Gmail zawiedzie. Szablon tekstowy + HTML, temat `Rovos Specials: wykryto zmianę <data ISO>`.
- Testy: `vitest 2.x` + `playwright` e2e, `msw` do mockowania fetch, `nodemailer-mock`. TDD: najpierw test czerwony, potem kod.
- Deploy: `gh repo create Enkidu-png/rovos-monitor --public` + `vercel link` + `vercel env add` + `git push` → auto-deploy. CI: `npm run lint && npm run test && npm run build`.

**Zakazy stackowe:** zakaz `axios` (użyć natywnego `fetch`), zakaz `puppeteer` (użyć `playwright-core`), zakaz nowych zależności mailowych poza `nodemailer`, zakaz bazy SQL (tylko KV).

## 3. Graf zależności artefaktów (F-krok 1)

```
DANE KANONICZNE (config/monitor.json, KV schema + walidacja)
  ↓
F0: scaffold + env + KV mock + walidacja
  ↓
F1: systemy przekrojowe ─┬─ scraper-engine (fetch+cheerio+playwright fallback)
                         ├─ normalizer + hasher (SHA256)
                         ├─ storage-adapter (KV/file)
                         └─ email-service (nodemailer/gmail)
  ↓ (wszystkie 4 muszą być gotowe, test-first z playground /dev)
F2: szkielet ── layout + routing + /api/health + /dashboard skeleton
  ↓
F3: cron feature ── /api/cron/check (scrape→normalize→hash→compare→store→notify) + manual /api/check
  ↓
F4: dashboard feature ── / (status, lastCheck, hash, history, manual trigger button, email test)
  ↓
F5: polish ── perf (<100ms hash), a11y (AA), SEO/OG, 404, error boundaries, rate-limit, cron logs, screenshot
  ↓
Fn: bramka decyzyjna ── prod cron enable (Vercel Hobby: max 1 cron/h → już OK), domena, koszty KV, App Password rotacja
```

Test cięcia (F-krok 3): nic w F1 nie importuje z F3 (engine nie zna cron), F2 nie importuje z F3, F3 używa F1+F2. Po F2 projekt deployowalny (dashboard placeholder + /api/health). Po F3 pierwsze realne działanie (cron + mail).

## 4. Prace ukryte S8 — konfrontacja z inputem

| S8 | Czy w inpucie? | Dopisane jako | Uwaga |
|----|----------------|---------------|-------|
| Dane kanoniczne + walidacja w CI | NIE | F0-02, F0-03 | `config/monitor.json` schema zod, KV keys walidacja, `npm run validate` w CI |
| Fonty/diakrytyki | NIE | F5-03 | Email HTML musi obsłużyć polskie znaki `ąęć` w temacie/treści, test `F5-03` |
| Env/klucze | częściowo (mail) | F0-04 | `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `CRON_SECRET` — instrukcja `vercel env add` + `.env.example` |
| 404 | NIE | F5-02 | `app/not-found.tsx` + test |
| SEO/OG | NIE | F5-02 | `app/layout.tsx` metadata, `og:image`, `robots.txt` |
| Analytics | NIE | F5-04 | Vercel Analytics opcjonalnie, logi cron w KV |
| Import backlogu | NIE | F0-05 | `BACKLOG.md` → GitHub Issues via `gh issue create` (skrypt) |
| Deploy | TAK (ma działać online) | F0-06, Fn-01 | `vercel link`, `vercel --prod`, env vars, cron weryfikacja |
| Monitoring (logi, alerty) | NIE | F3-05, F5-04 | Logi każdego checka w KV `rovos:history`, email o błędzie scrapera (po 3 failach) |
| Rate limit / dedup | NIE | F3-04 | Nie wysyłaj maila częściej niż 1/h mimo wielu zmian, hash dedup |
| Cloudflare bypass | ukryte | F1-02 | Fallback playwright, obsługa `Just a moment` detection, retry 3× co 2s |
| TDD infrastruktura | TAK (/tdd) | F0-01 | `vitest.config.ts`, coverage ≥80%, czerwony test przed kodem |

Wynik: dopisano 12 pozycji ukrytych.

## 5. Dane kanoniczne — jedno źródło prawdy

| Plik/klucz | Zawartość | Walidacja | Kto pisze/czyta |
|------------|-----------|-----------|-----------------|
| `config/monitor.json` | `{ url: "https://rovos.com/journeys/specials/", selector: "main", intervalMinutes: 60, recipient: "js@architekton.gda.pl", sender: "noreply@rovos-monitor.vercel.app" }` | `zod` schema w `lib/config.ts`, `npm run validate` | F0 tworzy, F1/F3 czytają |
| `KV: rovos:lastHash` | `string` SHA256 ostatniej znormalizowanej treści | `z.string().length(64)` | F3 pisze, F4 czyta |
| `KV: rovos:lastContent` | `string` znormalizowany text (do 50KB, truncate) | `z.string().max(50000)` | F3 pisze, F4 czyta |
| `KV: rovos:lastCheck` | `ISO string` czasu ostatniego checka | `z.string().datetime()` | F3 pisze, F4 czyta |
| `KV: rovos:history` | `Array<{ timestamp, hash, changed, error? }>` max 100 | `z.array().max(100)` | F3 push, F4 czyta |
| `KV: rovos:emailLog` | `Array<{ timestamp, to, subject, success }>` max 50 | `z.array().max(50)` | F3 push |

Zakaz duplikacji: hash liczony tylko w `lib/hasher.ts`, email wysyłany tylko przez `lib/email.ts`, KV dostęp tylko przez `lib/storage.ts`.

## 6. Decyzje otwarte i rozstrzygnięte

**Rozstrzygnięte (nie pytam):**
- Fresh repo + Vercel project nowy (nie istniejący) → `rovos-monitor`.
 - Storage: `@upstash/redis` (dawniej `@vercel/kv` deprecated) — env `UPSTASH_REDIS_REST_URL`. Alternatywa Blob odrzucona (gorsza do historii).
- Scraper fallback: `playwright-core` lazy, nie `puppeteer`.
- Email via `nodemailer` + Gmail SMTP (bo user wybrał Gmail MCP). App Password instrukcja w README.
- Cron co 60 min (user wybrał). Vercel Hobby pozwala `* * * * *` tylko na 1 cron dziennie? Weryfikacja: Hobby pozwala cron co 1h — OK.

**Otwarte → rozstrzygnięcie wariantem prostszym + wpis w DECISIONS.md (nie blokuje startu):**
- Czy wysyłać maila z pełnym diffem czy tylko link? → Prostszy: mail z linkiem + krótkim snippetem zmiany (≤500 znaków) + hash. Pełny diff w dashboardzie.
- Czy monitorować też PDF bezpośrednio? → Nie — monitorujemy HTML specials; PDF link pojawi się w HTML diffie.

**Blokujące zadane userowi (już odpowiedział 2026-09-11):**
- Tryb: TIME ✅
- Mail: Gmail MCP ✅
- Częstotliwość: co 1h ✅
- Repo: Enkidu-png/rovos-monitor ✅

Brak dalszych blokad — plan samowystarczalny.

## 7. Słownik pojęć (S6) — używaj TYLKO tych nazw w pakiecie

| Pojęcie | Definicja | Gdzie używane |
|---------|-----------|---------------|
| `rovos-watch` | Nazwa projektu / Vercel project `rovos-monitor` | README, BACKLOG, HANDOFF |
| `scraper-engine` | Moduł `lib/scraper.ts`: `fetch` + `cheerio` + fallback `playwright-core`, zwraca znormalizowany content string | F1, F3 |
| `normalizer` | Funkcja `normalizeContent(html, selector)` — usuwa `script`, `style`, `nonce`, `cloudflare`, trim, collapse whitespace, lower? nie lower | F1 |
| `hasher` | Funkcja `hashContent(normalized)` → SHA256 hex 64 znaki | F1, F3 |
| `storage-adapter` | Moduł `lib/storage.ts` abstrakcja KV: `getLastHash`, `setLastHash`, `getHistory`, `pushHistory` | F1, F3, F4 |
| `email-service` | Moduł `lib/email.ts`: `sendChangeNotification({ to, url, snippet, hash })` via nodemailer | F1, F3 |
| `check-cycle` | Pojedynczy przebieg `/api/cron/check`: scrape → normalize → hash → compare → store → notify (jeśli changed) | F3 |
| `change-detected` | Stan `hash !== lastHash && lastHash !== null` → wysyłka maila + wpis history `changed: true` | F3 |
| `dashboard` | Strona `/` (app/page.tsx) pokazująca `lastCheck`, `lastHash`, `history`, przycisk `Sprawdź teraz` | F2, F4 |
| `playground` | Strona `/dev/scraper` do testowania scrapera bez crona (tylko dev) | F1 |

## 8. Zasady twarde — ponumerowane, egzekwowalne (łamanie = odrzucony PR)

**Z01 — Szczegółowość = testowalność.** Każde zdanie spec bez liczby/algorytmu/kryterium jest błędem. Zakaz: przymiotnik bez liczby (np. atrakcyjny dashboard, blyskawiczny scraper). Wymagaj: `400ms timeout`, `SHA256`, `hash 64 znaki`.

**Z02 — TDD bez wyjątków.** Każdy moduł `lib/*` ma test `*.test.ts` napisany PRZED kodem, coverage ≥70% linii. Commit bez `npm test` zielonego = odrzucony. Dowód: `npm run test -- --coverage`.

**Z03 — Style WYŁĄCZNIE przez tokeny CSS.** Zero hardkodowanych kolorów/rozmiarów w `.tsx` (wyjątek: `lib/email.ts` — email HTML używa inline hex, bo nie ma CSS). Tokeny w `app/globals.css` `:root { --color-bg: #fafaf7; --radius: 8px }`. Złamanie: `style={{ color: '#ff0000' }}` w `app/` → PR odrzucony.

**Z04 — Kanon typografii (OBOWIĄZKOWY).** (a) zakaz wyśrodkowanych kropek `·` jako ozdobników między słowami; (b) zakaz długich myślników `—` w copy/UI (używaj `-` lub `:`); (c) zero emoji w UI (dozwolone w mailu jako wyjątek, ale nie w dashboardzie); (d) zakaz lewego brandowego paska akcentu `border-left` na calloutach/cytatach/pillach (użyć `background` + `radius`).

**Z05 — Jedno źródło prawdy na typ danych.** `config/monitor.json` + `lib/config.ts` dla configu, `lib/hasher.ts` dla hash, `lib/storage.ts` dla KV, `lib/email.ts` dla maili. Duplikacja logiki w komponencie = odrzucony PR.

**Z06 — Bezpieczeństwo env.** Sekrety (`GMAIL_APP_PASSWORD`, `KV_REST_API_TOKEN`, `CRON_SECRET`) NIGDY w repo, tylko `vercel env` + `.env.local` (gitignored). Logi nie mogą wypisywać wartości env, tylko `***`. Walidacja na granicach: `zod` dla KV i request headers.

**Z07 — Scraper odporny na Cloudflare.** Każde wywołanie `scraper-engine` musi: (1) wykryć `Just a moment` / `cf-mitigated` i ponowić z playwright fallback, (2) retry 3× co 2000 ms, (3) timeout 10000 ms (Hobby maxDuration 10s), (4) zwrócić `error` zamiast rzucać. Brak fallback = test F1-02 nie przejdzie.

**Z08 — Email dedup i rate-limit.** `sendChangeNotification` wysyła tylko gdy `change-detected` i nie wysłano już maila w ostatnie 60 min (sprawdź `emailLog`). Temat: `Rovos Specials - wykryto zmiane - <YYYY-MM-DD HH:mm UTC>`. Treść zawiera: URL, snippet ≤500 znaków, hash, link do dashboardu. Zero maili przy pierwszym uruchomieniu (inicjalizacja hasha bez powiadomienia).

**Z09 — Cron idempotentny i logowalny.** `/api/cron/check` musi: walidować `Authorization: Bearer CRON_SECRET` (wymagane zawsze; `x-vercel-cron` sam nie wystarcza — bez sekretu 401), zawsze zapisać `lastCheck` i `history` nawet przy błędzie, zwrócić JSON `{ changed, hash, durationMs }` w <2000 ms (bez playwright) lub <10000 ms (z playwright, Hobby limit 10s). Logi w `history` max 100 wpisów, rotate FIFO.

**Z10 — Dostępność i perf progi.** Dashboard: Lighthouse perf ≥85, a11y ≥95, `next build` bez błędów, `npm run lint` 0 errors. Scraper `hashContent` <50 ms dla 50KB input. Strona `/` musi działać bez JS (SSR) i z `prefers-reduced-motion`.

**Z11 — Komunikacja w klasach.** Każda wypowiedź do usera (oraz raport workera) dzieli się na klasy w kolejności: `[naprawione]`, `[zauważone (issue) - dopisane]`, `[zauważone (issue) - nie dopisane]`, `[zauważone (info) - dopisane]`, `[zauważone (info) - nie dopisane]`, `[do decyzji]`, `[wyjaśnienie]`. Brak klas = niekompletny raport.

**Z12 — Kontekst TYLKO mierzony.** Zakaz szacowania „na oko". Orkiestrator: `cat ~/.claude/context-usage.txt`, worker: `bash ~/.claude/agent-context.sh`. Próg ≥55% → handoff. Brak pliku = pracuj dalej.

