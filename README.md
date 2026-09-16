# Rovos Monitor

Monitoring https://rovos.com/journeys/specials/ - wykrywanie zmian ofert Rovos Rail. Cron co 60 min, hash SHA256, mail na js@architekton.gda.pl, dashboard status.

## Env - wymagane zmienne

Wszystkie sekrety tylko via env, nigdy w repo (Z06).

| Zmienna | Przeznaczenie |
|---------|---------------|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob RW Token (storage) |
| `GMAIL_USER` | Gmail SMTP user |
| `GMAIL_APP_PASSWORD` | Gmail App Password (16 znakow) |
| `CRON_SECRET` | Cron auth Bearer token |
| `ZENROWS_API_KEY` | ZenRows bypass Cloudflare (primary scraper) |
| `NEXT_PUBLIC_APP_URL` | URL aplikacji |

Plik wzorcowy: `.env.example` zawiera puste klucze bez wartosci. Lokalnie skopiuj do `.env.local` (gitignored).

```bash
cp .env.example .env.local
# uzupelnij GMAIL_APP_PASSWORD, BLOB_READ_WRITE_TOKEN, CRON_SECRET, ZENROWS_API_KEY
```

## Vercel env

```bash
vercel env add BLOB_READ_WRITE_TOKEN
vercel env add GMAIL_USER
vercel env add GMAIL_APP_PASSWORD
vercel env add CRON_SECRET
vercel env add ZENROWS_API_KEY
```

Wersja produkcyjna Hobby: `vercel.json` cron `0 8 * * *` (daily, limit Hobby). Hourly `0 * * * *` wymaga Pro - decyzja w F7.

## Deploy

```bash
npm run build # musi zakonczyc ✓ Compiled successfully
vercel --prod # deploy produkcyjny
# preview
vercel # deploy preview - sprawdź curl
curl https://rovos-monitor.vercel.app/api/health # 200 { ok: true }
curl https://rovos-monitor.vercel.app/ # 200
```

Lokalny preview:

```bash
npm run dev # http://localhost:3000
curl http://localhost:3000/api/health | jq .ok # true
curl http://localhost:3000/ | grep "Rovos Monitor"
```

## Testy i jakosc

```bash
npm run lint # 0 errors
npm test # all green
npm run test -- --coverage # >=70%
```

Budzety: hashContent 50KB <50ms, /api/health <100ms, /api/cron/check <2000ms mock <10000ms z playwright.

## Stack

Next.js 16.3.4 App Router, TypeScript strict, Tailwind tokeny CSS, zod, vitest, nodemailer, @vercel/blob, cheerio, playwright-core + @sparticuz/chromium, ZenRows (js_render + antibot + premium_proxy).

## ZenRows - bypass Cloudflare

Primary scraper `lib/scraper.ts:scrapeViaZenRows` używa `https://api.zenrows.com/v1/?apikey=${ZENROWS_API_KEY}&url=...&js_render=true&antibot=true&premium_proxy=true&wait=5000` z `AbortSignal.timeout(15000)` i RETRY 2. Chain: 1) ZenRows -> jeśli content bez `Just a moment` -> sukces `usedFallback false`; 2) fallback fetch 3x2000; 3) playwright. Mail `lib/email.ts:buildEmailHtml` zawsze zawiera link `https://rovos.com/journeys/specials/` Zobacz oferty specjalne + `href` url + hash/snippet 500. Weryfikacja: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check | jq .hash` -> 64 hex nie e3b0c442, `.error` null, `.usedFallback` false, `durationMs` <15000.

## Cron

GET /api/cron/check wymaga `Authorization: Bearer $CRON_SECRET`, zwraca `{ changed, hash, durationMs }`.

## Dashboard

GET / - SSR revalidate 60s, status card + history, przycisk Sprawdz teraz.

## Licencja

Prywatny projekt Enkidu-png/rovos-monitor.
