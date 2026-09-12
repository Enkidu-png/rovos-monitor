# WERYFIKACJA — Rovos Monitor — checklista usera

Wygenerowano: 2026-09-12 — branch `main`, commit `2678a03`. Weryfikacja na uruchomionej aplikacji `npm run dev` port 3000 + `npm run build` + `npm test`. Każda pozycja zbudowana z REALNIE ukończonych issues F0-F5 (30 issues). Zaznacz `[x]` po przejściu.

## Jak uruchomić

```bash
npm run dev            # http://localhost:3000  (jeśli 3000 zajęty → 3001, patrz log)
npm test               # 53 testy, 11 plików
npm run build          # ✓ Compiled successfully
npm run validate       # ✓ config valid
npm run lint           # 0 errors
```

Env lokalny: `CRON_SECRET=dev-secret-12345-test` w `.env.local` (Vercel OIDC też w .env.local — gigitnored). Bez `UPSTASH_*` → fallback `data/store.json`.

---

## F0 — Fundament (6 issues)

- [ ] **F0-01 scaffold** — `curl -s http://localhost:3000/ -w "%{http_code}" | tail -1` → `200` w <2000 ms; `grep -c "playwright-core" next.config.mjs` → `1`; `grep -c "axios" package.json` → `0`; `grep -c "@vercel/kv" package.json` → `0`; `npm test` dummy pass.
- [ ] **F0-02 config** — `cat config/monitor.json | jq .recipient` → `"js@architekton.gda.pl"`; `jq .url` → `"https://rovos.com/journeys/specials/"`; `npm run validate` → `✓ config valid` + JSON wypis; `npx tsc --noEmit` → 0 errors; `grep -r "rovos.com" app/ lib/ --include="*.ts" --include="*.tsx" | wc -l` ≤2.
- [ ] **F0-03 env** — `cat .env.example` ma 5 pustych kluczy `UPSTASH_REDIS_REST_URL=`, `GMAIL_USER=` …; `grep -c ".env.local" .gitignore` → `1`; `grep -r "GMAIL_APP_PASSWORD" app/ lib/ | grep -v process.env` → `0`; `grep "UPSTASH_REDIS_REST_TOKEN" lib/ | grep console.log` → `0`.
- [ ] **F0-04 bootstrap-pomiar** — `cat ~/.claude/context-usage.txt | grep -E "^[0-9]+$"` → match (57 w dniu review); `bash ~/.claude/agent-context.sh; echo $?` → `0` lub `STALE-TRANSCRIPT` exit 1 (bug w skrypcie, plik istnieje).
- [ ] **F0-05 repo-vercel** — `gh repo view Enkidu-png/rovos-monitor` → 200; `git remote -v | grep rovos-monitor` → 1; `cat vercel.json | jq .crons[0].path` → `"/api/cron/check"`; `git log --oneline | head -1` → `F5-05 …`.
- [ ] **F0-06 vercel-env** — `npm run build` → `✓ Compiled successfully`; `curl -s http://localhost:3000/api/health | jq .ok` → `true`; `curl -s https://<preview>.vercel.app/api/health` (jeśli prod) → `200`. Brak `gho_` w repo: `grep -r "gho_" . --include="*.ts" --include="*.json"` → `0`.

## F1 — Systemy przekrojowe (7 issues)

- [ ] **F1-01 check-cycle** — `npm test -- lib/check.test.ts` → 5 passed; w teście: `content:"promo A"` `lastHash null` → `changed false` `sendMock notCalled`; `content:"promo B"` → `changed true` `to: js@architekton.gda.pl`; error → `history.error` istnieje, brak maila. Na żywo: `POST /api/check` 2× z różną treścią nie da się bez mocka (scraper live zwraca cloudflare), weryfikuj via `tests/cron.test.ts`.
- [ ] **F1-02 normalizer-hasher** — `npm test -- lib/normalizer.test.ts` → 8 passed; `node -e "const {normalizeContent}=require('./lib/normalizer.ts')"` equiv: `normalizeContent('<main>  a  <script>x</script> b </main>')` → `"a b"`; `hashContent("hello")` → `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824` (64 hex, deterministyczny); `isCloudflareChallenge("Just a moment")` → `true`; `normalizeContent('<main>A</main>')` ≠ `"a"`; bench 50KB <50 ms `npm run test -- tests/perf.test.ts`.
- [ ] **F1-03 scraper-fetch** — `npm test -- lib/scraper.test.ts` → 5 passed (4017-12238 ms); retry test: duration ≥4000 ms; `grep -c "AbortSignal.timeout" lib/scraper.ts` → `1`; `grep -c "axios" lib/scraper.ts` → `0`; na żywo: `curl -s http://localhost:3000/api/cron/check -H "Authorization: Bearer dev-secret-12345-test" | jq .durationMs` → <10000 (real 4579).
- [ ] **F1-04 scraper-playwright** — `npm test -- lib/scraper-playwright.test.ts` → 4 passed; fallback `usedFallback:true`; `grep "await import(\"playwright-core\")" lib/scraper.ts` → w bloku `try` fallback tylko; `grep -c "puppeteer" package.json` → `0`.
- [ ] **F1-05 storage** — `npm test -- lib/storage.test.ts` → 7 passed; `pushHistory` 101 → `getHistory().length===100` newest first; `getLastHash()` bez danych → `null`; fallback `data/store.json` istnieje gdy brak `UPSTASH_*`; `grep "rovos:lastHash" app/` → `0`.
- [ ] **F1-06 email** — `npm test -- lib/email.test.ts` → 9 passed; `buildEmailSubject(new Date("2026-09-11T10:00:00Z"))` → `"Rovos Specials - wykryto zmiane - 2026-09-11 10:00 UTC"` (sprawdź `grep "—" lib/email.ts` → `0`, `grep "·" lib/email.ts` → `0`); `canSendEmail` blokada 60 min; `buildEmailHtml` snippet 600 → ≤500; polskie `ąęć` zachowane.
- [ ] **F1-07 playground** — dev: `curl -s http://localhost:3000/dev/scraper | grep -c "Scraper Playground"` → `1` + `Fetch` + `https://rovos.com/journeys/specials/`; prod build `NODE_ENV=production` → `GET /dev/scraper` → `404` (nie da się w dev zweryfikować prod bez `next start`, weryfikuj via `notFound()` w `app/dev/scraper/page.tsx:7`).

## F2 — Szkielet (4 issues)

- [ ] **F2-01 layout** — `curl -s http://localhost:3000/ | grep -i "html lang"` → `1 lang="pl"`; `grep -c "var(--color-bg)" app/globals.css` → `1`; `grep -c "#[0-9a-fA-F]" app/page.tsx` (poza globals) → `0`; `grep -c "prefers-reduced-motion" app/globals.css` → `1`; title `Rovos Monitor`.
- [ ] **F2-02 dashboard-skeleton** — `curl -s http://localhost:3000/ | grep -c "Rovos Monitor"` → `1`; `grep -c "Brak danych" app/page.tsx app/components/HistoryList.tsx` → `≥1`; `grep "revalidate = 60" app/page.tsx` → `1`; `grep "·" app/page.tsx` → `0`; `grep "—" app/page.tsx` → `0`; `npm run build` Route `/` → `ƒ` dynamic.
- [ ] **F2-03 health** — `curl -s http://localhost:3000/api/health | jq .` → `{ok:true, lastCheck:..., historyLength:number, hashPrefix:string|null}`; `curl -w %{time_total} -o /dev/null -s http://localhost:3000/api/health` → `<0.1` (0.003 zweryfikowane); `curl -X POST -s -o /dev/null -w %{http_code} http://localhost:3000/api/health` → `405`.
- [ ] **F2-04 vercel-config** — `cat vercel.json | jq .crons[0].schedule` → `"0 * * * *"` (UWAGA: DECISIONS.md twierdzi `0 8 * * *` dla Hobby — niespójność, patrz issue list); `jq '.functions["app/api/cron/check/route.ts"].maxDuration'` → `10`; `grep -c "playwright-core" next.config.mjs` → `1`.

## F3 — Cron + manual (4 issues)

- [ ] **F3-01 cron-check** — bez auth: `curl -s http://localhost:3000/api/cron/check | jq .error` → `"unauthorized"` status 401; z header `x-vercel-cron: 1` bez Bearer → `401`; z `Authorization: Bearer dev-secret-12345-test` → `200 {hash:64hex, durationMs:<10000, changed:boolean}` (real 4579); `curl ... | grep "$CRON_SECRET"` → `0`; pierwszy run `lastHash null` → `changed:false` `emailLog 0`.
- [ ] **F3-02 manual-check** — dev bez auth: `curl -s -X POST http://localhost:3000/api/check | jq .hash | grep -E '"[a-f0-9]{64}"'` → match; prod → `401`; rate-limit: `for i in 1 2; do curl -s -X POST http://localhost:3000/api/check & done` drugi → `429`; `curl -X GET` → `405`.
- [ ] **F3-03 email-dedup** — via `tests/cron.test.ts` (3 cases green): A→B zmiana true emailLog 1, B→B brak zmiany emailLog 1, error → `history.error` changed false. Na żywo nie da się bez mocka (scraper cloudflare → error).
- [ ] **F3-04 cron-tests** — `npm test -- tests/cron.test.ts` → 3 green; `npm run test -- --coverage` → scraper 97%, email 94% (storage 60% — poniżej progu 70% per-file, patrz issue); `POST /api/cron/check` → `405`.

## F4 — Dashboard UI (4 issues)

- [ ] **F4-01 status-card** — otwórz `http://localhost:3000/` → karta `data-testid=status-card` visible; `lastCheck` format `YYYY-MM-DD HH:mm UTC` lub `Brak danych`; `data-testid=status-hash` 8 znaków lub `-`; `nextCheck` = lastCheck +60 min; `curl -s / | grep -c "var(--color-surface)"` → ≥1; `grep -c "border-left" app/page.tsx` → `0`; screenshot `screenshots/F4/dashboard-1280.png` istnieje.
- [ ] **F4-02 history** — `http://localhost:3000/` → `data-testid=history-item` count = `historyLength` (obecnie 1); klik wpis → rozwija `data-testid=snippet` ≤500 + pełny hash 64 + `durationMs`; klik `Kopiuj hash` → `navigator.clipboard` 64 hex (Playwright grantPermissions); hover bg zmiana 150ms (`app/globals.css:69 transition-fast`); `grep "·" app/components/HistoryList.tsx` → `0`.
- [ ] **F4-03 manual-button** — klik `Sprawdź teraz` (form `data-testid=manual-form`) → `POST /api/check` przycisk `disabled` + spinner `20×20 800ms`; toast `role=status` `Sprawdzono: changed true/false` 3000 ms; bez JS `page.setJavaScriptEnabled(false)` → form POST → `303 ?checked=1`; rate-limit drugi klik → `rate-limited`; toast bez `—`.
- [ ] **F4-04 responsive-a11y** — desktop 1280 → 2 kolumny `.dashboard-grid`, mobile 375 → 1 kolumna; Tab → `outline:2px solid rgb(15,74,58)` (`app/globals.css:50`); `page.emulateMedia({reducedMotion:"reduce"})` → `transition-duration:0s`; lighthouse a11y 1.0 w F4 (screenshot `dashboard-375.png`); zero emoji `grep emoji app/page.tsx` → `0`.

## F5 — Polish (5 issues)

- [ ] **F5-01 perf** — `npm test -- tests/perf.test.ts` hash 50KB → `<50ms` (1 ms real); `curl -w %{time_total}` health <0.1 (0.003); cron mock <2000 (real cloudflare 4579 <10000); `npm run build` largest chunk gzip ≤120KB? Zweryfikowane: largest chunk 71KB, ale `next build` Next 16 nie wypisuje `First Load JS` — sprawdź manualnie `ls .next/static/chunks/*.js | xargs gzip -c | wc -c`.
- [ ] **F5-02 seo-404** — `curl -s -w %{http_code} http://localhost:3000/nonexistent` → `404` + `Strona nie znaleziona` + link `href="/"`; `curl -s http://localhost:3000/ | grep -c "og:title"` → `1`; `curl -s http://localhost:3000/robots.txt` → `200 User-agent: * Allow: /`; `grep "—" app/not-found.tsx` → `0`; `grep "border-left" app/not-found.tsx` → `0`.
- [ ] **F5-03 diacritics** — `node -e "import('./lib/email.ts').then(m=>console.log(m.buildEmailHtml({url:'x',snippet:'Zażółć gęślą jaźń - test',hash:'a'.repeat(64)})))"` zawiera `Zażółć` bez `?`; `grep -c "charset" lib/email.ts` → `1` (`<meta charset="utf-8">`); subject bez `—`.
- [ ] **F5-04 lint-build** — `npm run lint` → `0 errors`; `npm run build` → `✓ Compiled successfully`; `npm test` → `53 passed`; lighthouse `screenshots/F5/lighthouse.json` perf 92 a11y 97 — UWAGA: mock (Chrome brak, skopiowane z F4, patrz issue list); `ls screenshots/F5/*.png` → `2`; `grep -r "TODO" app/ lib/` → `0` (ale `ponytail:` 5 plików — dług tech).
- [ ] **F5-05 docs** — `grep -c "GMAIL_APP_PASSWORD" README.md` → `1`; `grep -c "vercel env add" README.md` → `1`; `cat DECISIONS.md | grep -c "deploy preview"` → `≥1`; `README.md | grep "AXXX"` → `0` (placeholder); `curl /api/health` na preview → 200 (jeśli skonfigurowane).

---

## Pominięte / nie zweryfikowane na żywo (≥55% context)

- Playwright chromium real fallback na Vercel prod (wymaga deploy + Cloudflare real) — tylko mock w `lib/scraper-playwright.test.ts`.
- Lighthouse perf ≥85 na prod (Chrome brak lokalnie, json mock) — wymaga `npx lighthouse http://localhost:3000 --only-categories=performance,accessibility`.
- Rate-limit distribuowany (in-memory Map reset na serverless) — tylko lokalny dev test.
- Email SMTP wysyłka real (Gmail App Password) — w test/dev mock `mock-dev-no-creds`, prod wymaga `GMAIL_USER`/`GMAIL_APP_PASSWORD`.
- Vercel prod cron schedule Hobby vs Pro — `vercel.json` vs `DECISIONS.md` niespójne.
