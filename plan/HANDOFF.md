# HANDOFF — rovos-monitor (TIME, orkiestrator)

**Projekt:** rovos-monitor — monitoring https://rovos.com/journeys/specials/ → mail js@architekton.gda.pl co 1h
**Wariant:** TIME (orkiestrator + workerzy Opus, JEDEN naraz, paczka do 55% okna, NEXT-TASKS.md)
**Repo:** `Enkidu-png/rovos-monitor` (public, do utworzenia w F0-05)
**Branch:** `main`
**Plan:** `plan/` (01-07 + README + HANDOFF)

## Stan repo

- `main` — pakiet planistyczny gotowy (7 plików + README + HANDOFF), kod aplikacji jeszcze nie istnieje (przed F0).
- `git log` — tylko commity planu; kod pojawi się od F0-01.
- `BACKLOG.md` — 0 issues ukończonych, pierwsze nieukończone: `F0-01 scaffold`.

## Ukończone issues

- (brak — przed buildem)

## Następne issue

- `F0-01 scaffold` — scaffold Next.js 15 + TS + Tailwind + next.config.mjs (z playwright external) + lighthouse

## Pozostałe w fazie F0

- F0-02 config, F0-03 env, F0-04 bootstrap pomiarów, F0-05 repo+vercel, F0-06 vercel env + preview

## Pułapki / stan środowiska

- Cloudflare na rovos.com (403 `Just a moment`) — wymaga playwright fallback, TIMEOUT 10000, maxDuration 10 Hobby.
- Storage: `@upstash/redis` (nie `@vercel/kv` — deprecated), env `UPSTASH_REDIS_REST_URL`.
- Gmail: `GMAIL_APP_PASSWORD` wymaga 2FA + App Password — instrukcja w F0-03.
- `~/.claude/context-usage.txt` zapisywany przez statusline (57% na starcie, weryfikuj w F0-04), `~/.claude/agent-context.sh` istnieje.
- `next.config.mjs` musi powstać w F0-01 (nie w F2) — inaczej F1 fail.

## Decyzje w toku

- F7 bramka: prod cron `0 * * * *` vs `0 8 * * *` + domena — czeka na usera po F5.

## Otwarte problemy

- Brak — plan po krytyce (10 poprawek naniesionych).

## Jak wznowić

1. Przeczytaj `HANDOFF.md` (ten plik), `plan/06-MASTER-PROMPT.md`, `plan/07-BACKLOG.md`.
2. Zweryfikuj `git log`, `cat ~/.claude/context-usage.txt`, `bash ~/.claude/agent-context.sh`.
3. Wznów `/loop` od pierwszego `[ ]` w BACKLOG.

---
*Teams: HANDOFF poprawiany przy ≥55% (nie dopisywany), NEXT-TASKS.md per worker. Model NIE wywołuje /clear sam — wypisuje kick-starter i kończy turę.*
