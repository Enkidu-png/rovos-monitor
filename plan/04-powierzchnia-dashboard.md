# 04 — Powierzchnia: Dashboard (`/`)

## Cel i wyróżnik (S7)

Dashboard to jedyna powierzchnia wizualna dla usera końcowego (odbiorca maila może też wejść na stronę). Wyróżnik vs inne powierzchnie: `paper-stack` — karty z subtelnym `shadow-sm` + `border` + `radius` na jasnym `bg`, bez akcentowego paska. Signature interaction: `history-reveal` — każdy wpis history rozwija się na klik pokazując snippet + hash + duration.

Szkielet wspólny z `05-api-cron`: używa tych samych tokenów, layoutu `app/layout.tsx`, `schemas` i `storage-adapter`.

## Układ (S4 — warianty brzegowe przy definicji)

- `≥1024px`: dwukolumna — lewa `status card` (lastCheck, lastHash, nextCheck), prawa `history list` (100 wpisów, scroll `max-h-[60vh]`).
- `640–1023px`: jedna kolumna, karty jedna pod drugą.
- `<640px`: history jako karty (nie tabela), hash skrócony `abc123…def456` z przyciskiem Kopiuj.
- Brak JS: strona SSR, przycisk "Sprawdź teraz" to `<form method="POST" action="/api/check">` — działa bez JS. Z JS → `fetch` + optimistic update.

## Tabela interakcji `zdarzenie → reakcja` (S3)

| Zdarzenie | Reakcja | Wariant brzegowy |
|-----------|---------|------------------|
| Hover na wpis history | `background: var(--color-surface)` → `--color-bg` w 150ms, cursor pointer | `prefers-reduced-motion` → brak transition |
| Klik wpis history | Rozwiń snippet (max 500 znaków) + pełny hash + durationMs, collapse poprzedniego | Mobile: tap rozwija, drugi tap zwija |
| Klik "Sprawdź teraz" | POST `/api/check`, disabled + spinner 400ms, po odpowiedzi toast "Sprawdzono: changed true/false" + odśwież dane (revalidate 1s) | Brak JS: form POST + redirect do `/` z `?checked=1` |
| Klik "Kopiuj hash" | `navigator.clipboard.writeText(hash)`, tooltip "Skopiowano" 1500ms | Brak clipboard API → `prompt(hash)` fallback |
| Klik "Wyślij test mail" | POST `/api/email/test` (tylko dev lub z `CRON_SECRET`), toast success/error | Bez auth → 401 |
| Fokus klawiaturą (Tab) | `outline: 2px solid var(--color-accent)`, `outline-offset: 2px` na każdym button/link | `focus-visible` tylko |
| Scroll history | `overflow-y: auto`, scrollbar cienki, `overscroll-behavior: contain` | iOS: `-webkit-overflow-scrolling: touch` |
| Stan pusty (pierwsze uruchomienie, history 0) | Karta `Brak danych - pierwsze sprawdzenie w toku. Cron uruchomi się za <60 min.` + przycisk "Sprawdź teraz" primary | — |
| Stan błędu (ostatni check error) | Badge `error` w `status card`: `Ostatnie sprawdzenie: błąd - cloudflare-still-blocked`, link do logów, nie czerwony pasek boczny (Z04) | — |
| Reduced motion | Wszystkie `transition` 0ms, spinner → statyczny tekst "Ładowanie..." | `@media (prefers-reduced-motion: reduce)` |
| Brak KV / offline | Banner `Tryb lokalny - dane z pliku` (gdy `UPSTASH_REDIS_REST_URL`/`KV_REST_API_URL` brak), nie blokuje UI | — |

## Spec elementów (S1 — liczby)

- `status card`: `padding: var(--space-lg) 24px`, `radius: 12px`, `shadow-sm`, `border: 1px solid var(--color-border)`. Tytuł `16px/600`, hash `12px mono`, timestamp `14px muted`.
- `history item`: `padding: 12px 16px`, `border-bottom: 1px solid`, `min-height: 48px`, `gap: 8px`. Badge `changed` → `background: var(--color-success)`, `color: white`, `radius-sm 6px`, `padding: 2px 8px`, `font-size: 11px`.
- Przycisk primary: `height: 40px`, `padding: 0 20px`, `radius: 8px`, `background: var(--color-accent)`, `hover: var(--color-accent-hover)` w `150ms`. Disabled `opacity: 0.5`, `cursor: not-allowed`.
- Spinner: `20×20px`, `border: 2px`, `animation: spin 800ms linear infinite` (wyłącz przy reduced-motion).

## Anty-spec — czego NIE robić (S5)

1. Zakaz slidera/carousela na history — lista lub tabela, nie slider.
2. Zakaz kafelków 3-w-rzędzie na dashboardzie — max 2 kolumny (S4).
3. Zakaz scroll-hijacking — natywny scroll, zero `scroll-snap` na stronie głównej.
4. Zakaz emoji w UI (Z04) — statusy przez badge tekstowe `zmiana` / `brak` / `błąd`.
5. Zakaz lewego paska akcentu `border-left` na kartach (Z04).
6. Zakaz wyśrodkowanych `·` między metadanymi (Z04) — użyć `gap` lub `|`.

## Słownik pojęć w tej powierzchni

Używa `dashboard`, `history-reveal`, `status card` z `01`. Dodatkowo `toast` — powiadomienie `role="status"` na 3000ms po akcji.

## Dane i render

- SSR: `app/page.tsx` async `await getLastCheck()` etc. `export const revalidate = 60` (co minutę).
- Dane z `lib/storage.ts` (KV/file). Walidacja `zod` przed renderem.
 - Metadata: `title: "Rovos Monitor - status"`, `description: "Monitoring https://rovos.com/journeys/specials/"`.

## DoD powierzchni

- Build bez błędów, Lighthouse perf ≥85, a11y ≥95, `next build` ok.
- Zero hardkodu kolorów (grep CI).
- Screenshot `screenshots/F4-dashboard.png` (desktop 1280×800 i mobile 375×812).
