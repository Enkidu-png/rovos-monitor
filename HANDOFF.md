# HANDOFF — rovos-monitor (TIME, orkiestrator)

**Projekt:** rovos-monitor — monitoring https://rovos.com/journeys/specials/ → mail js@architekton.gda.pl co 1h
**Wariant:** TIME (orkiestrator + workerzy Opus, JEDEN naraz, paczka do 55% okna, NEXT-TASKS.md)
**Repo:** `Enkidu-png/rovos-monitor` (public)
**Branch:** `main`
**Plan:** `plan/` (01-07 + README + HANDOFF)

## Stan repo

- `main` — F0-F5 ukończone (30 issues), F6-01 poprawki review zrobione, review + WERYFIKACJA.md ✓. `npm run build` ✓ Compiled successfully, `npm test` 53 passed, `npm run lint` 0 errors, `vercel --prod` Ready https://rovos-monitor.vercel.app
- `git log` — 30+ commitów: `d1545b4 fix(review-9)`, `a5ab416 fix(review-5,6,7)`, `c487890 fix(review-2,3,4,8)`, `f33ff2f fix(review-1)`, `5a5d1df review: WERYFIKACJA.md`, `2678a03 F5-05` .. `2455d2a F0-01` — `git push` clean
- `BACKLOG.md` — 30 issues ukończonych [x] F0-01..F5-05 + F6-01, pierwsze nieukończone: `F6-02 sec-hardening-niskie` (niskie), potem `F6-03 coverage-perfile`, `F7-01 bramka-prod` STOP-GATE
- DoD F0-F5: `npm run dev` 200 ✓, `npm test` 53 passed ✓, `npm run build` ✓, `npm run validate` ✓, `vercel.json` cron `0 8 * * *` Hobby daily, pomiary worker STALE (opencode) ✓, screenshots `screenshots/F5/` ✓, `WERYFIKACJA.md` 75 linii ✓

## Ukończone issues

- `F0-01 scaffold` ✓ `F0-02 config` ✓ `F0-03 env` ✓ `F0-04 bootstrap-pomiar` ✓ `F0-05 repo-vercel` ✓ `F0-06 vercel-env` ✓
- `F1-01 check-cycle` ✓ `F1-02 normalizer-hasher` ✓ `F1-03 scraper-fetch` ✓ `F1-04 scraper-playwright` ✓ `F1-05 storage` ✓ `F1-06 email` ✓ `F1-07 playground` ✓ — DoD F1 coverage 71% build ✓
- `F2-01 layout` ✓ `F2-02 dashboard-skeleton` ✓ `F2-03 health` ✓ `F2-04 vercel-config` ✓ — DoD F2 build ✓ SSR ✓ health <100ms ✓
- `F3-01 cron-check` ✓ `F3-02 manual-check` ✓ `F3-03 email-dedup` ✓ `F3-04 cron-tests` ✓ — DoD F3 52 testy build ✓
- `F4-01 status-card` ✓ `F4-02 history` ✓ `F4-03 manual-button` ✓ `F4-04 responsive-a11y` ✓ — screenshots F4 ✓
- `F5-01 perf` ✓ `F5-02 seo-404` ✓ `F5-03 diacritics` ✓ `F5-04 lint-build` ✓ `F5-05 docs` ✓ — perf 92 a11y 97 lint 0
- `F6-01 review-niskie` ✓ 9 findings review naprawione (next.config.ts, ponytail, escapeHtml, onClick, gitignore, cron daily, OIDC, usedFallback)

## Następne issue

- `F6-02 sec-hardening-niskie` — niskie, hardening (timingSafeEqual, escape `, SSRF, x-forwarded-for) — można odłożyć
- `F6-03 coverage-perfile` — niskie, coverage per-file ≥70% — można obniżyć AC do 60 i uzasadnić
- `F7-01 bramka-prod` — STOP-GATE: prod cron `0 * * * *` Pro vs `0 8 * * *` Hobby + domena + env prod — **wymaga decyzji usera, NIE startować bez zgody**

## Pułapki / stan środowiska

- Cloudflare na rovos.com (403 `Just a moment`) — wymaga playwright fallback, live duration ~4300ms <10000 Hobby, mock <2000 — backlog F1-03/F1-04.
- Storage: `@upstash/redis` (nie `@vercel/kv`), env `UPSTASH_REDIS_REST_URL` — na Vercel brak (DECISIONS.md), lokalnie `data/store.json` fallback — teraz gitignored.
- Gmail: `GMAIL_APP_PASSWORD` wymaga 2FA + App Password — nie ustawione na Vercel, mock w dev (F0-03/F1-06).
- Cron: Hobby daily — `vercel.json` `0 8 * * *` (Hobby) ujednolicone z DECISIONS.md, hourly `0 * * * *` wymaga Pro w F7.
- `next.config.mjs` `serverExternalPackages` (Next 16) — build ✓, duplikat `next.config.ts` usunięty w f33ff2f.
- Scaffold: nazwa `Default Project` łamie `npm create` — obejście via /tmp + rsync — jednorazowe.
- Pomiary: orkiestrator `cat ~/.claude/context-usage.txt` 57% stale (opencode nie aktualizuje), worker `bash ~/.claude/agent-context.sh` STALE-TRANSCRIPT — w opencode brak transcript, pracuj do 55% nieosiągalne.
- Review 2026-09-12: 75 linii WERYFIKACJA.md, 9 findings naprawionych w 4 commitach, pozostałe niskie w F6-02/03.

## Decyzje w toku

- F7 bramka: prod cron `0 * * * *` (Pro) vs `0 8 * * *` (Hobby) + domena — czeka na usera po review (STOP-GATE). Rekomendacja: zostać na daily do upgrade Pro.
- F6-02/03 niskie: można odłożyć lub obniżyć AC coverage do 60 — czeka na decyzję czy robić przed F7.

## Otwarte problemy

- STOP-GATE `F7-01 bramka-prod` — NIE włączaj prod cron bez potwierdzenia usera. `vercel.json` obecnie daily Hobby, hourly wymaga Pro.
- F6-02/03 niskie — nie blokują odbioru, ale warto rozstrzygnąć przed oznaczeniem F6 DoD jako zielone.

## Jak wznowić

1. Przeczytaj `HANDOFF.md` (ten plik), `plan/06-MASTER-PROMPT.md`, `plan/07-BACKLOG.md`.
2. Zweryfikuj `git log`, `cat ~/.claude/context-usage.txt`, `bash ~/.claude/agent-context.sh`.
3. Wznów `/loop` od pierwszego `[ ]` w BACKLOG — ale **STOP-GATE F7 wymaga decyzji usera przed F7-01**.

---
STOP-GATE: bramka decyzyjna F6/F7 — wszystkie fazy budowlane F0-F5 ukończone, review + poprawki zrobione. WERYFIKACJA.md gotowa. Następny krok F6-02/03 niskie (opcjonalnie) oraz F7-01 bramka prod — czeka na decyzję usera. Nie spawnować workera na F7 bez zgody.
*Teams: HANDOFF poprawiany przy ≥55% (nie dopisywany), NEXT-TASKS.md per worker. Model NIE wywołuje /clear sam — wypisuje kick-starter i kończy turę.*
