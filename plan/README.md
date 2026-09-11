# Rovos Monitor — pakiet planistyczny (TIME)

## Spis plików

| Plik | Po co | Czyta worker gdy |
|------|-------|------------------|
| `01-analiza-zasady-slownik.md` | Analiza inputu, graf zależności, S8, dane kanoniczne, 12 zasad Z01-Z12, słownik 10 pojęć | zawsze (zasady) |
| `02-fundamenty-tokeny-dane.md` | Tokeny CSS, zod schemas, struktura repo, budżety, env | F0, F2 |
| `03-systemy-przekrojowe.md` | Algorytmy scraper/normalizer/hasher/storage/email + check-cycle + playground | F1 |
| `04-powierzchnia-dashboard.md` | Dashboard `/` — układ, tabela zdarzenie→reakcja, anty-spec | F2, F4 |
| `05-powierzchnia-api-cron.md` | API `/api/cron/check`, `/api/check`, `/api/health`, `/dev/scraper` + vercel.json | F2, F3 |
| `06-MASTER-PROMPT.md` | Kontrakt orkiestratora + workerów (TIME, Opus, 55%, NEXT-TASKS.md, HANDOFF) | orkiestrator |
| `07-BACKLOG.md` | Kolejka F0-F7, AC obserwacyjne, CZYTAJ per issue, GITLAB-IMPORT | każdy worker |
| `HANDOFF.md` | Stan po kickoffie, aktualizowany przy ≥55% (POPRAW nie dopisuj) | orkiestrator |
| `../HANDOFF.md` | Kopia w root repo (źródło prawdy dla orkiestratora) | orkiestrator |

## Jak wystartować (TL;DR) — 5 kroków

1. Otwórz **nową sesję** (czyste okno).
2. Wklej cały blok z `06-MASTER-PROMPT.md` (wraz z `/ponytail:ponytail full` i `/caveman:caveman ultra`).
3. Orkiestrator spawnuje pierwszego workera na `F0-01` (scaffold). Worker weryfikuje `~/.claude/statusline-command.sh` i `~/.claude/agent-context.sh`.
4. Po `F0` orkiestrator proponuje `/remote-control` i wchodzi w `/loop` — sztafeta workerów (JEDEN naraz, każdy do 55% własnego okna, `NEXT-TASKS.md`).
5. Po `F5` orkiestrator spawnuje reviewera → `WERYFIKACJA.md`, potem `STOP-GATE: F7` i pyta o prod cron.

Kontynuacja po handoffie: `cat ~/.claude/context-usage.txt` ≥55 → orkiestrator poprawia `HANDOFF.md`, wypisuje `KICK-STARTER` w czacie. User: `/clear` → wklej kick-starter → nowa sesja jako orkiestrator.

## Co user dostarcza po drodze

| Kiedy | Co | Jak |
|-------|----|-----|
| F0-03 | `GMAIL_APP_PASSWORD` (16 znaków, App Password po włączeniu 2FA) | `vercel env add GMAIL_APP_PASSWORD` + `.env.local` |
| F0-03 | `UPSTASH_REDIS_REST_URL` + `TOKEN` (Vercel Marketplace → Upstash Redis) | `vercel env add` |
| F0-03 | `CRON_SECRET` (`openssl rand -hex 32`) | `vercel env add CRON_SECRET` |
| F7 | Decyzja prod cron `0 * * * *` vs `0 8 * * *` + domena | odpowiedź w czacie |

Wszystko inne (kod, testy, deploy) robią workerzy.

## Decyzje otwarte (z 01)

- Mail z snippetem ≤500 znaków + hash + link (nie pełny diff) — pełny diff w dashboardzie.
- Monitorujemy HTML `/specials/`, nie PDF bezpośrednio (PDF link w HTML diffie).
- Storage `@upstash/redis` (nie `@vercel/kv`), `maxDuration 10` Hobby (Pro 30 rozważamy w F7).
- Cron auth: zawsze `Bearer CRON_SECRET` (nagłówek `x-vercel-cron` sam nie wystarcza).

## Start przez skill

```bash
/loopstart kickoff
# skill wykryje plan/ i wariant TIME, zweryfikuje node/gh/vercel/pluginy i wykona 06-MASTER-PROMPT.md
```

Po handoffie: `/clear` + kick-starter z czatu poprzedniej sesji.

## Architektura pętli TIME

Orkiestrator (model sesji) → spawn JEDEN worker Opus (paczka issues) → worker mierzy `bash ~/.claude/agent-context.sh` po każdym issue ≥55 → `NEXT-TASKS.md` + raport `WORKER: batch-done|blocked` → orkiestrator weryfikuje `git log` + `BACKLOG`, `cat ~/.claude/context-usage.txt` ≥55 → `HANDOFF.md` + kick-starter → `/clear`. `F1-01 ⚠ HARD` jako pierwszy w fazie (świeże okno) lub osobna mini-paczka bez override.

## Pomiary kontekstu

- Orkiestrator: `cat ~/.claude/context-usage.txt` (statusline, liczba 0-100).
- Worker: `bash ~/.claude/agent-context.sh` (własny transkrypt, NO-AGENT-TRANSCRIPT → pracuj dalej).
- Zakaz szacowania na oko — złamanie kontraktu.
