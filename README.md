# Rovos Monitor

Monitoring https://rovos.com/journeys/specials/ - wykrywanie zmian ofert Rovos Rail. Cron co 60 min, hash SHA256, mail na js@architekton.gda.pl, dashboard status.

## Env - wymagane zmienne

Wszystkie sekrety tylko via env, nigdy w repo (Z06).

| Zmienna | Przeznaczenie |
|---------|---------------|
| `UPSTASH_REDIS_REST_URL` | Vercel Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel Redis REST TOKEN |
| `GMAIL_USER` | Gmail SMTP user |
| `GMAIL_APP_PASSWORD` | Gmail App Password (16 znakow) |
| `CRON_SECRET` | Cron auth Bearer token |
| `NEXT_PUBLIC_APP_URL` | URL aplikacji |

Plik wzorcowy: `.env.example` zawiera puste klucze bez wartosci. Lokalnie skopiuj do `.env.local` (gitignored).

```bash
cp .env.example .env.local
# uzupelnij GMAIL_APP_PASSWORD, UPSTASH_REDIS_REST_URL, CRON_SECRET
```

## Vercel env

```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add GMAIL_USER
vercel env add GMAIL_APP_PASSWORD
vercel env add CRON_SECRET
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

Next.js 16.3.4 App Router, TypeScript strict, Tailwind tokeny CSS, zod, vitest, nodemailer, @upstash/redis, cheerio, playwright-core + @sparticuz/chromium.

## Cron

GET /api/cron/check wymaga `Authorization: Bearer $CRON_SECRET`, zwraca `{ changed, hash, durationMs }`.

## Dashboard

GET / - SSR revalidate 60s, status card + history, przycisk Sprawdz teraz.

## Licencja

Prywatny projekt Enkidu-png/rovos-monitor.
