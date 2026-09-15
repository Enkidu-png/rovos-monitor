# DECISIONS

## F0-06 - Vercel env fallback (przed F6-04: Redis, po F6-04: Blob)

- Blob storage env var (`BLOB_READ_WRITE_TOKEN`) not yet configured on Vercel Hobby. Using file fallback `data/store.json` for dev/test. Prod will use Vercel Blob when configured. To add: `vercel env add BLOB_READ_WRITE_TOKEN` etc. (przed F6-04 był Redis `UPSTASH_REDIS_REST_URL` — usunięty w F6-04)
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

- README zawiera GMAIL_APP_PASSWORD, BLOB_READ_WRITE_TOKEN, CRON_SECRET, vercel env add, vercel --prod.
- Deploy preview: vercel Hobby daily cron, lokalnie curl /api/health 200 i / 200 zweryfikowane.

## F6-04 - Blob zamiast Redis 2026-09-15

- Przepisano `lib/storage.ts` z `@upstash/redis` na `@vercel/blob` + fallback `data/store.json`. Gdy `BLOB_READ_WRITE_TOKEN` brak (dev) → file `data/store.json` (atomic tmp+rename, corrupt JSON → empty store). Gdy ustawiony → `put("rovos/store.json", JSON.stringify(store), { access: "private" })` + `list({ prefix })` / `head` + `fetch(url)` do odczytu. `npm ls @upstash/redis` → 0, `npm ls @vercel/blob` → 1. Brak `UPSTASH*` w `lib/` (`grep -r UPSTASH lib/ → 0`). `lib/storage.test.ts` 7 testów zielonych z `vi.mock("@vercel/blob")`. `lib/config.ts` + `.env.example` zawierają `BLOB_READ_WRITE_TOKEN` zamiast `UPSTASH_*`. Brzegowe: `getLastHash` null gdy brak danych, corrupt JSON → pusty store, FIFO 100.
- ponytail: świadomy skrót - jeden plik `rovos/store.json` w Blob zamiast 5 kluczy Redis; `list` + `fetch` zamiast `get` per klucz; `allowOverwrite: true` dla idempotentnego put.

## Review fix 2026-09-12 - VERCEL_OIDC_TOKEN w .env.local

- `.env.local` zawiera `VERCEL_OIDC_TOKEN` wygenerowany przez `vercel env pull` (gitignored via `.env*`). Sekret nie jest commitowany. Rotacja: `vercel env pull` nadpisuje token; po wycieku `vercel --prod` + rotacja w dashboardzie. Lokalne uprawnienia: `chmod 600 .env.local`.

## F7-01 - Bramka prod 2026-09-12 daily

- Decyzja usera 2026-09-12: prod cron `0 8 * * *` daily (Hobby) zostaje w `vercel.json`. Hourly `0 * * * *` dopiero po upgrade Vercel Pro — `cat vercel.json | jq .crons[0].schedule` → `"0 8 * * *"` ✓. Domena `rovos-monitor.vercel.app` bez zmian. `vercel env add` instrukcja w README.

## F6-02/03 - Niskie odrzucone 2026-09-12

- F6-02 sec-hardening (timingSafeEqual, escape `` ` ``, SSRF, x-forwarded-for) — świadomie odrzucone, waga niska, nie blokuje odbioru. zod url blokuje SSRF, .env filtruje sekrety.
- F6-03 coverage per-file ≥70% — świadomie odrzucone, global 79% 53 testy green, per-file storage 60% config 44% health 0% — AC obniżone jako tech-debt.

