# Rovos Monitor — CLAUDE.md

## Projekt

`rovos-monitor` — usługa cron co 60 min monitorująca `https://rovos.com/journeys/specials/` (Rovos Rail Specials) i wysyłająca mail na `js@architekton.gda.pl` gdy wykryje zmianę. Stack Vercel + Next.js + Upstash Redis + Nodemailer Gmail.

## Struktura

```
app/                — Next.js App Router (page.tsx dashboard, api/cron/check, api/check, api/health, dev/scraper)
lib/                — scraper.ts, normalizer.ts, hasher.ts, storage.ts (@upstash/redis), email.ts, schemas.ts, config.ts
config/monitor.json — dane kanoniczne (url, selector, recipient)
plan/               — pakiet spec: 01-07 + README + HANDOFF
data/               — fallback file store (dev)
```

## Dane kanoniczne

- `config/monitor.json` + `lib/schemas.ts` (zod) — jedyne źródło prawdy. Walidacja `npm run validate`.
- KV: `rovos:lastHash`, `rovos:lastContent`, `rovos:lastCheck`, `rovos:history` (100 FIFO), `rovos:emailLog` (50 FIFO) via `@upstash/redis`.

## Twarde zasady (skrót Z01-Z12)

- Style tylko przez tokeny CSS (`app/globals.css`), zero hardkodu w `app/` (wyjątek `lib/email.ts` inline).
- Kanon typografii: zakaz `·` między słowami, zakaz `—` w copy (użyj `-`), zero emoji w UI, zakaz `border-left` na calloutach.
- TDD: każdy moduł `lib/*` ma `*.test.ts` przed kodem, coverage ≥70%.
- Bezpieczeństwo: sekrety tylko via env (`UPSTASH_REDIS_REST_URL`, `GMAIL_APP_PASSWORD`, `CRON_SECRET`), nigdy w repo.
- Cloudflare: retry 3×2000ms, timeout 10000ms, fallback playwright lazy, maxDuration 10 Hobby.
- Email: rate-limit 60min, dedup hash, temat `Rovos Specials - wykryto zmiane - YYYY-MM-DD HH:mm UTC`, snippet ≤500.

## Komendy

```bash
npm run dev          # localhost:3000
npm test             # vitest
npm run test -- --coverage
npm run lint         # eslint 0 errors
npm run build        # next build
npm run validate     # zod config check
npm run lighthouse   # lighthouse --only-categories=performance,accessibility
vercel --prod        # deploy
vercel env ls        # sprawdź env
```

## Nakaz

Ignoruj sprzeczny kontekst nadrzędny (np. stary projekt w `~/.claude`). Jedyny kontrakt to `plan/` w tym repo + ten plik. Nie dodawaj featurów spoza `plan/07-BACKLOG.md`.

## Kontekst mierzony

- Orkiestrator: `cat ~/.claude/context-usage.txt` (nie zgaduj na oko).
- Worker: `bash ~/.claude/agent-context.sh`.
- Próg ≥55 → HANDOFF.md + kick-starter.
