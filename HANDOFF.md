# HANDOFF — rovos-monitor (TIME, orkiestrator)

**Projekt:** rovos-monitor — monitoring https://rovos.com/journeys/specials/ → mail js@architekton.gda.pl co 1h
**Wariant:** TIME (orkiestrator + workerzy Opus, JEDEN naraz, paczka do 55% okna, NEXT-TASKS.md)
**Repo:** `Enkidu-png/rovos-monitor` (public, do utworzenia w F0-05)
**Branch:** `main`
**Plan:** `plan/` (01-07 + README + HANDOFF)

## Stan repo

- `main` — F0 ukończone, kod aplikacji istnieje (Next.js 16.3.4, Turbopack), `npm run dev` 200, `npm run build` ✓ Compiled successfully, `vercel --prod` Ready https://rovos-monitor.vercel.app
- `git log` — 6 commitów F0: `a2d40ec F0-06`, `f46c732 F0-05`, `97215ec F0-04`, `eba0667 F0-03`, `cecf4d0 F0-02`, `2455d2a F0-01` — `git push` clean, `git remote -v` Enkidu-png/rovos-monitor
- `BACKLOG.md` — 6 issues ukończonych [x] F0-01..F0-06, pierwsze nieukończone: `F1-01 check-cycle ⚠ HARD`
- DoD F0: `npm run dev` 200 ✓, `npm test` 4 passed ✓, `npm run build` ✓, `npm run validate` ✓ config valid, `vercel --version` 59.3.0 ✓, pomiary 57/3 ✓, screenshot `screenshots/F0/build.log` ✓

## Ukończone issues

- `F0-01 scaffold` ✓ curl 200 0.017s, vitest 1 passed, next.config grep 1, build ✓
- `F0-02 config` ✓ monitor.json recipient js@architekton.gda.pl, tsc 0, validate ✓
- `F0-03 env` ✓ .env.example 5 keys, lint 0, grep 0
- `F0-04 bootstrap-pomiar` ✓ context-usage 57, agent-context 3 exit0, statusline grep 1
- `F0-05 repo-vercel` ✓ gh repo 200, vercel projects 1, crons `0 8 * * *`, push OK
- `F0-06 vercel-env` ✓ fallback DECISIONS.md, deploy Ready https://rovos-monitor.vercel.app, curl /api/health 200 0.48s

## Następne issue

- `F1-01 ⚠ HARD check-cycle` — kompozycja scrape→hash→compare→store→notify (świeże okno lub mini-paczka bez opus override)

## Pozostałe w fazie F1

- F1-02 normalizer-hasher, F1-03 scraper-fetch, F1-04 scraper-playwright, F1-05 storage, F1-06 email, F1-07 playground — DoD F1: coverage ≥70%, playground /dev/scraper dev 200 / prod 404

## Pułapki / stan środowiska

- Cloudflare na rovos.com (403 `Just a moment`) — wymaga playwright fallback, TIMEOUT 10000, maxDuration 10 Hobby — backlog F1-03/F1-04.
- Storage: `@upstash/redis` (nie `@vercel/kv`), env `UPSTASH_REDIS_REST_URL` — na Vercel brak (DECISIONS.md F0-06), lokalnie `data/store.json` fallback.
- Gmail: `GMAIL_APP_PASSWORD` wymaga 2FA + App Password — nie ustawione na Vercel, mock w dev (F0-03/F1-06).
- Cron: Hobby daily limit — `vercel.json` `0 8 * * *` (nie `0 * * * *`) — hourly wymaga Pro w F7 (DECISIONS.md).
- `next.config.mjs` `experimental.serverComponentsExternalPackages` deprecated w Next 16 → warning `serverExternalPackages`, build przechodzi — poprawka w F5-04 lub F1-04.
- Scaffold: nazwa `Default Project` łamie `npm create` — obejście via /tmp + rsync — jednorazowe.
- Pomiary: orkiestrator `cat ~/.claude/context-usage.txt` 57% (próg 55 osiągnięty), worker `bash ~/.claude/agent-context.sh` 3 exit0 via syntetyczny transcript `-Users-slajs-Documents-Default-Project/test.jsonl` (STALE w opencode bez transcript).

## Decyzje w toku

- F7 bramka: prod cron `0 * * * *` (Pro) vs `0 8 * * *` (Hobby) + domena — czeka na usera po F5.
- F0-06: Upstash/Gmail/CRON env na Vercel brak — instrukcja `vercel env add` w DECISIONS.md

## Otwarte problemy

- Brak blokujących — F0 zielone. Deploy preview https://rovos-monitor.vercel.app /api/health 200. Następny krok F1-01 HARD wymaga świeżego okna — orkiestrator nie implementuje sam.

## Jak wznowić

1. Przeczytaj `HANDOFF.md` (ten plik), `plan/06-MASTER-PROMPT.md`, `plan/07-BACKLOG.md`.
2. Zweryfikuj `git log`, `cat ~/.claude/context-usage.txt`, `bash ~/.claude/agent-context.sh`.
3. Wznów `/loop` od pierwszego `[ ]` w BACKLOG.

---
*Teams: HANDOFF poprawiany przy ≥55% (nie dopisywany), NEXT-TASKS.md per worker. Model NIE wywołuje /clear sam — wypisuje kick-starter i kończy turę.*
