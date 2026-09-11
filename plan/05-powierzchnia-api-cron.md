# 05 — Powierzchnie: API (`/api/cron/check`, `/api/check`, `/api/health`, `/dev/scraper`)

## 05.1 Wspólny szkielet (S7)

Wszystkie route'y w `app/api/*/route.ts` (Next.js App Router). Wspólne: `lib/config.ts` (zod), `lib/storage.ts`, `lib/scraper.ts`, `lib/email.ts`. Każdy route ma `export const runtime = "nodejs"` i `dynamic = "force-dynamic"`. Brak wspólnego layoutu — JSON API.

Wyróżnik per route:
- `cron/check`: cron-trigger, auth `Bearer CRON_SECRET`, idempotentny, loguje zawsze
- `check` (manual): POST z dashboardu, wymaga `CRON_SECRET` lub dev, natychmiastowy
- `health`: publiczny, bez auth, do uptime monitora, zwraca `{ ok, lastCheck, hashPrefix }`
- `dev/scraper`: tylko `development`, playground UI, nie API JSON

## 05.2 `/api/cron/check` — cron cycle (główny feature)

**Spec:**
- Metoda: `GET`
- Auth: `Authorization: Bearer <CRON_SECRET>` — wymagane ZAWSZE. `x-vercel-cron: 1` sam NIE wystarcza (bez Bearer → 401). Vercel Cron na Hobby wysyła `Authorization: Bearer <CRON_SECRET>` jeśli skonfigurowano env, nie polegać na nagłówku. Inaczej `401 { error: "unauthorized" }`.
- Flow: `check-cycle` z `03` (scrape → normalize → hash → compare → store → notify).
- Odpowiedź sukces: `200 { changed: boolean, hash: string, lastHash: string|null, durationMs: number, usedFallback: boolean, error?: string }`
- Błąd scrapera: nadal `200` ale `{ changed: false, error: string, durationMs }` (nie 500, bo cron nie ma retry na 500).
- Timeout: Vercel Hobby `maxDuration = 10` (Pro pozwala 30) — `vercel.json` `10`, route `export const maxDuration = 10`. Z playwright <10000ms.
- Log: zawsze `pushHistory` i `setLastCheck` nawet przy error.

**Tabela zdarzenie → reakcja (S3):**

| Zdarzenie | Reakcja |
|-----------|---------|
| GET z poprawnym `Bearer` | Wykonaj `check-cycle`, zwróć JSON 200, `durationMs` dokładne |
| GET z Vercel Cron header (`x-vercel-cron: 1`) bez Bearer | 401 (nagłówek sam nie autoryzuje — wymaga Bearer; log warning) |
| GET bez auth i bez cron header | `401 { error: "unauthorized" }` w <100ms, nie wykonuj scrape |
| `scrapeSpecials` zwraca `error` | Zapisz history z `error`, nie wysyłaj maila, zwróć 200 z `error` |
| `hash !== lastHash` (change-detected) | Wyślij mail via `email-service` (jeśli `canSendEmail()`), push `emailLog`, history `changed: true` |
| Pierwsze uruchomienie (`lastHash null`) | Zapisz hash, `changed: false`, NIE wysyłaj maila (Z08), history `changed: false` |
| Rate-limit maila (<60 min od ostatniego) | Pomiń wysyłkę, log `rate-limited` w `emailLog` jako `success: false` |
| `POST` na ten route | `405 Method Not Allowed` |
| Reduced motion / mobile | Nie dotyczy (API, brak UI) |
| Brak KV env | Użyj file adapter, nie rzucaj 500 |

**Anty-spec (S5):**
1. Zakaz wysyłki maila przy `lastHash null` (inicjalizacja).
2. Zakaz 500 przy błędzie scrapera — zawsze 200 z `error` polem.
3. Zakaz logowania sekretów w odpowiedzi — `CRON_SECRET` nigdy w JSON.

## 05.3 `/api/check` — manual trigger z dashboardu

- Metoda: `POST`
- Auth: `Authorization: Bearer <CRON_SECRET>` lub `process.env.NODE_ENV === "development"` (dev bez auth). Inaczej 401.
- Body: `{}` (pusty). Ratę limit: max 1 request / 30s na IP (in-memory `Map`, `429` jeśli przekroczone).
- Flow: identyczny `check-cycle` jak cron.
- Odpowiedź: `200 { changed, hash, durationMs, usedFallback, error? }`
- Użycie: przycisk "Sprawdź teraz" na dashboardzie (fetch POST). Brak JS → `<form POST>` fallback.

**Tabela zdarzenie → reakcja:**

| Zdarzenie | Reakcja |
|-----------|---------|
| POST z auth | Wykonaj cycle, 200 JSON |
| POST bez auth w prod | 401 |
| POST bez auth w dev | Wykonaj cycle (dev bypass) |
| Rate limit (2 request w 30s) | 429 `{ error: "rate-limited, try in 30s" }` |
| GET na `/api/check` | 405 |

## 05.4 `/api/health` — publiczny healthcheck

- Metoda: `GET`, bez auth
- Odpowiedź: `200 { ok: true, lastCheck: string|null, hashPrefix: string|null (8 znaków), historyLength: number, uptime: string }`
- Budżet: <100 ms, nie wykonuje scrape.
- Użycie: Vercel uptime, user może sprawdzić czy cron żyje.

| Zdarzenie | Reakcja |
|-----------|---------|
| GET | Zwróć JSON z KV/file, 200 w <100ms |
| POST | 405 |
| Brak KV | Zwróć `lastCheck: null`, nie 500 |

## 05.5 `/dev/scraper` — playground (tylko dev)

- Route: `app/dev/scraper/page.tsx`, `export const dynamic = "force-dynamic"`
- W prod: `notFound()` (404). Warunek: `if (process.env.NODE_ENV !== "development") notFound()`
- UI: input URL (default `config.url`), button Fetch, select `selector`, pokazuje `content (2000 znaków)`, `hash`, `durationMs`, `usedFallback`, `error`, `isCloudflareChallenge`.
- Cel: test-first dla F1, weryfikacja scrapera bez crona. Worker może otworzyć `http://localhost:3000/dev/scraper`.

**Tabela zdarzenie → reakcja:**

| Zdarzenie | Reakcja |
|-----------|---------|
| GET w dev | Render SSR z formą |
| GET w prod | 404 |
| Klik Fetch | POST do `/api/check` lub client `scrapeSpecials` via server action, spinner 400ms |
| Hover przycisku | `hover: accent-hover` 150ms |
| Reduced motion | Brak animacji |

## 05.6 Konfiguracja Vercel

`vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/check", "schedule": "0 * * * *" }],
  "functions": { "app/api/cron/check/route.ts": { "maxDuration": 10 } }
}
```
Prod Pro (jeśli Cloudflare wymaga >10s): w F7 rozważ `maxDuration: 30` (wymaga Vercel Pro).

`next.config.mjs`: `experimental.serverComponentsExternalPackages: ["@sparticuz/chromium", "playwright-core"]`.

## DoD powierzchni API

- `curl -H "Authorization: Bearer $CRON_SECRET" /api/cron/check` → 200 JSON z `hash` 64 znaki
- `curl /api/cron/check` bez auth → 401
- `curl /api/health` → 200 w <100ms
- `curl -X POST /api/check` bez auth w prod → 401, w dev → 200
- `/dev/scraper` w prod → 404, w dev → 200
