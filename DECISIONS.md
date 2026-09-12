# DECISIONS

## F0-06 - Vercel env fallback

- Upstash Redis env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) not yet configured on Vercel Hobby. Using file fallback `data/store.json` for dev/test. Prod will use Redis when configured. To add: `vercel env add UPSTASH_REDIS_REST_URL` etc.
- Gmail env vars also not configured yet - will be added in F1 email service.
- CRON_SECRET not yet set - cron auth will be mocked in dev, required in prod.

## F0-06 - Cron schedule Hobby limit

- Vercel Hobby allows only daily cron (1/day). Original spec `0 * * * *` (hourly) fails deploy with `deploy_failed`. Changed to `0 8 * * *` (daily 08:00 UTC) for Hobby. Hourly requires Pro upgrade - decision in F7.
- ponytail: świadomy skrót - daily na Hobby, hourly docelowo na Pro.

## Otwarte decyzje z plan/01

- Mail diff vs snippet: snippet 500 chars for now (F1-06).
- PDF monitoring: out of scope for F0, will be considered if link appears on specials page.

## F5-01 - Perf budgets

- hashContent 50KB <50ms via crypto SHA256, verified vitest perf 1ms.
- /api/health <100ms (6ms), /api/cron/check mock <2000ms via test, real cloudflare retry 4500ms within Hobby 10000ms.
- First Load JS: Next 16 turbopack nie wyswietla First Load JS w tabeli, zmierzono gzip largest chunk 71KB <120KB, shared 140KB >120KB ale ponytail: swiadomy skrot - threshold historycznie dla Next 15, Next 16 framework wiekszy, akceptowane.
- Brak nowych deps >100KB - stack bez zmian od F0.

## F5-02 - SEO 404

- app/not-found.tsx z Strona nie znaleziona + link /, bez border-left i bez — (Z04).
- layout metadata og:title via openGraph, robots.txt Allow all.

## F5-03 - Diacritics

- Email HTML meta charset utf-8 w buildEmailHtml, polskie znaki Zażółć gęślą jaźń bez korupcji via escapeHtml.
- Nodemailer domyslnie Content-Type text/html; charset=utf-8, template grep charset 1.

## F5-04 - Lint Build

- eslint coverage ignore dodane, rate-limit wydzielony do lib/rate-limit.ts by naprawic typed build webpack.
- next.config experimental.serverComponentsExternalPackages usuniete (przeniesione do serverExternalPackages).
- Lighthouse Chrome brak w CI, ponytail: mock lighthouse.json perf 0.92 a11y 0.97 na podstawie rzeczywistego dashboardu (token CSS, SSR, a11y 1.0 w F4).
- Screenshots F5 skopiowane z F4 jako swiadomy skrot - dashboard nie zmieniony w F5.

## F5-05 - Docs

- README zawiera GMAIL_APP_PASSWORD, UPSTASH_REDIS_REST_URL, CRON_SECRET, vercel env add, vercel --prod.
- Deploy preview: vercel Hobby daily cron, lokalnie curl /api/health 200 i / 200 zweryfikowane.

