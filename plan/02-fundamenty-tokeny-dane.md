# 02 — Fundamenty współdzielone: tokeny, modele danych, konwencje

## 2.1 Tokeny CSS (jedyny sposób stylowania — Z03)

Plik kanoniczny: `app/globals.css`. Zakaz hardkodu w komponentach. Wszystkie wartości przez `var(--*)`.

```css
:root {
  --color-bg: #fafaf7;
  --color-surface: #ffffff;
  --color-text: #1a1a1a;
  --color-text-muted: #6b6b6b;
  --color-border: #e5e2dd;
  --color-accent: #0f4a3a; /* Rovos ciemna zieleń */
  --color-accent-hover: #0d3d31;
  --color-error: #c0392b;
  --color-success: #27764a;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --max-width: 960px;
}
@media (prefers-color-scheme: dark) { :root { --color-bg: #121412; --color-surface: #1a1e1a; --color-text: #eaeaea; --color-border: #2a2e2a; } }
```

Użycie w komponencie: `className="bg-[var(--color-surface)] rounded-[var(--radius-md)]"` lub CSS module z `var()`. Grep w CI: `grep -r "style={{" app/ lib/ --include="*.tsx" && exit 1`.

## 2.2 Modele danych — zod schemas (jedno źródło prawdy Z05)

Plik kanoniczny: `lib/schemas.ts`. Wszystkie dane walidowane w runtime, nie tylko TS.

```ts
import { z } from "zod";

export const MonitorConfigSchema = z.object({
  url: z.string().url().default("https://rovos.com/journeys/specials/"),
  selector: z.string().default("main"),
  intervalMinutes: z.number().int().min(5).max(1440).default(60),
  recipient: z.string().email().default("js@architekton.gda.pl"),
  sender: z.string().email().default("noreply@rovos-monitor.vercel.app"),
});
export type MonitorConfig = z.infer<typeof MonitorConfigSchema>;

export const HistoryEntrySchema = z.object({
  timestamp: z.string().datetime(),
  hash: z.string().length(64).regex(/^[a-f0-9]+$/),
  changed: z.boolean(),
  error: z.string().optional(),
  durationMs: z.number().int().min(0).max(60000),
  snippet: z.string().max(500).optional(),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

export const KVKeys = {
  lastHash: "rovos:lastHash",
  lastContent: "rovos:lastContent",
  lastCheck: "rovos:lastCheck",
  history: "rovos:history",
  emailLog: "rovos:emailLog",
} as const;

export const EmailLogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  to: z.string().email(),
  subject: z.string().max(200),
  success: z.boolean(),
});
```

Walidacja w CI: `npm run validate` → `tsx lib/schemas.ts` parsuje `config/monitor.json` i próbuje `KV` mock.

## 2.3 Struktura repo i konwencje

```
rovos-monitor/
  app/
    globals.css          # tokeny
    layout.tsx           # metadata, fonty
    page.tsx             # dashboard
    not-found.tsx        # 404
    api/
      cron/check/route.ts # GET cron
      check/route.ts      # POST manual trigger
      health/route.ts     # GET health
    dev/scraper/page.tsx  # playground (dev only)
  lib/
    config.ts            # wczytuje monitor.json + env
    scraper.ts           # scraper-engine
    normalizer.ts        # normalizeContent
    hasher.ts            # hashContent
    storage.ts           # storage-adapter (KV/file)
    email.ts             # email-service
    schemas.ts           # zod
  config/monitor.json    # dane kanoniczne
  data/.gitkeep          # lokalny fallback
  tests/                 # vitest
  vercel.json            # crons
  vitest.config.ts
  next.config.mjs
```

**Konwencje:**
- Commity: `F0-01: opis` (prefix z BACKLOG). Jeden issue = jeden commit.
- Branch: `main` tylko. Zero feature branches w TIME (workerzy commitują prosto na main).
- Importy: absolutne `@/lib/*` (tsconfig paths).
- Env: `.env.example` bez wartości, `.env.local` gitignored. Vercel env via `vercel env add`.
- Testy: `*.test.ts` obok kodu lub w `tests/`, `npm test` → vitest, `npm run test:e2e` → playwright.
- Lint: `eslint` + `prettier`, `npm run lint` 0 errors, `npm run build` musi przejść.

## 2.4 Budżety i progi (S1 — liczby zamiast przymiotników)

| Obszar | Próg | Jak mierzyć |
|--------|------|-------------|
| `hashContent` dla 50KB | <50 ms | `vitest` bench `performance.now()` |
| `/api/cron/check` bez playwright | <2000 ms | `curl -w %{time_total}` |
| `/api/cron/check` z playwright | <10000 ms | jw. (Hobby maxDuration 10s) |
| Dashboard Lighthouse perf | ≥85 | `npm run lighthouse` |
| Dashboard a11y | ≥95 | jw. |
| Bundle JS (first load) | ≤120 KB | `next build` output |
| KV history size | ≤100 wpisów, FIFO | `lib/storage.ts` test |
| Email snippet | ≤500 znaków | `lib/email.ts` test |
| Retry scraper | 3× co 2000 ms, timeout 10000 ms | `lib/scraper.ts` test |

## 2.5 Env i sekrety (S8)

| Zmienna | Gdzie | Wymagana | Przykład |
|---------|-------|----------|----------|
| `UPSTASH_REDIS_REST_URL` | Vercel Redis | tak (prod) | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel Redis | tak (prod) | `AXXX...` |
| `KV_REST_API_URL` | alias (deprecated) | nie (fallback) | `https://xxx.upstash.io` |
| `KV_REST_API_TOKEN` | alias (deprecated) | nie (fallback) | `AXXX...` |
| `GMAIL_USER` | Gmail SMTP | tak (prod) | `js.architekton@gmail.com` lub sender |
| `GMAIL_APP_PASSWORD` | Gmail SMTP | tak (prod) | `abcd efgh ijkl mnop` (16 znaków) |
| `CRON_SECRET` | Cron auth | tak | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | App | nie | `https://rovos-monitor.vercel.app` |

W dev: `UPSTASH_*`/`KV_*` opcjonalne — fallback do `data/store.json` (file adapter). `GMAIL_*` mockowane w testach (`nodemailer-mock`). Storage używa `@upstash/redis` (`Redis.fromEnv()`), alias `@vercel/kv` deprecated.

## 2.6 Warianty brzegowe przy definicji (S4)

- Mobile: dashboard pojedynczy column, `<640px` tabela history → karty. Brak osobnej strony mobile.
- Brak JS: dashboard SSR, przycisk "Sprawdź teraz" jako `<form method="POST" action="/api/check">` (progressive enhancement).
- Brak KV (pierwsze uruchomienie): `getLastHash()` → `null`, `check-cycle` inicjalizuje bez maila, log `initialized`.
- Wolna sieć / Cloudflare challenge: scraper zwraca `{ error, durationMs }`, zapis do history z `error`, nie wysyła maila, dashboard pokazuje `error` badge.
- Reduced motion: `prefers-reduced-motion` → wyłącz `transition` (CSS `@media`).

## 2.7 Prace ukryte — jak pokryte w F0

- Walidacja danych: `F0-03` (`zod` + `npm run validate` w CI)
- Env: `F0-04` (`.env.example`, Vercel env)
- Deploy: `F0-06` (`vercel link`, `vercel --prod`)
- 404/SEO: `F2` i `F5` (szkielet + polish)
