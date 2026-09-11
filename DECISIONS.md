# DECISIONS

## F0-06 - Vercel env fallback

- Upstash Redis env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) not yet configured on Vercel Hobby. Using file fallback `data/store.json` for dev/test. Prod will use Redis when configured. To add: `vercel env add UPSTASH_REDIS_REST_URL` etc.
- Gmail env vars also not configured yet - will be added in F1 email service.
- CRON_SECRET not yet set - cron auth will be mocked in dev, required in prod.

## F0-06 - Cron schedule Hobby limit

- Vercel Hobby allows only daily cron (1/day). Original spec `0 * * * *` (hourly) fails deploy with `deploy_failed`. Changed to `0 8 * * *` (daily 08:00 UTC) for Hobby. Hourly requires Pro upgrade - decision in F7.
- ponytail: świadomy skrót - daily na Hobby, hourly docelowo na Pro.

## Otwarte decyzje z plan/01

- Mail diff vs snippet: snippet 500 chars for now (F1-06).
- PDF monitoring: out of scope for F0, will be considered if link appears on specials page.

