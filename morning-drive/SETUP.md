# Morning Drive — first-time setup

The page (`/morning-drive`) ships ready to load. Before it'll actually
produce content, three one-time setup steps:

## 1. Apply the Supabase migration

The page reuses the existing dadarcade Supabase project that Chess uses
(`https://momzrpcwlnakargfhexf.supabase.co`). Paste
[`migrations/001_init.sql`](./migrations/001_init.sql) into
**Supabase Studio → SQL Editor** and run it. Idempotent, safe to re-run.

Creates three tables: `morning_drive_days`, `morning_drive_seen`,
`morning_drive_attempts`.

## 2. Set env vars on Vercel

In **Vercel → Project → Settings → Environment Variables**, add (all
three environments unless noted):

| Name                          | Value                                                                          | Where  |
| ----------------------------- | ------------------------------------------------------------------------------ | ------ |
| `SUPABASE_URL`                | `https://momzrpcwlnakargfhexf.supabase.co`                                     | server |
| `SUPABASE_SERVICE_ROLE_KEY`   | (from Supabase Studio → Project Settings → API → service_role secret)          | server |
| `CRON_SECRET`                 | any random 32+ char string                                                     | server |

The AI SDK's Vercel AI Gateway authentication is wired automatically via OIDC
when the function runs on Vercel — no manual token to configure. For
`vercel dev` locally, run `vercel env pull` once so the dev session inherits
the same OIDC-issued Gateway token.

## 3. Verify the cron

In `vercel.json` the cron is registered at `30 8 * * *` UTC — that's 4:30 AM
US-Eastern during DST (March–November) and 3:30 AM Eastern outside DST. The
kids leave for school after 7 AM ET so either window is comfortable.

After your first deploy, **Vercel → Deployments → Crons** should list
`/api/morning-drive-cron`. To test manually before waiting overnight:

```bash
# Smoke-test against your prod URL
curl -X GET "https://dadarcade.com/api/morning-drive-cron?date=2026-05-14" \
  -H "Authorization: Bearer $CRON_SECRET"
```

You should see `{"ok": true, "status": "generated", ...}` on a successful
run, or `{"ok": true, "status": "exists", ...}` if today's row already exists.

## How it all hangs together

- **Cron at 4:30am ET** → `api/morning-drive-cron.js` reads the do-not-repeat
  lists + recent difficulty stats from Supabase, calls Sonnet via Vercel AI
  Gateway with a Zod-validated schema, writes the day's payload to
  `morning_drive_days`, logs every item to `morning_drive_seen`.

- **Page load** → `morning-drive/index.html` fetches `/api/morning-drive`,
  which reads the day from `morning_drive_days` and returns the JSON. If
  the row is missing (cron failed or hasn't run yet), the API falls back
  to on-demand generation — slower (~10–20s) but still ships.

- **Each math / vocab-match tap** → POSTed to `/api/morning-drive`, logged
  to `morning_drive_attempts` with `kid`, `topic`, `attempts`, `correct`.

- **Past Days pill** → `/api/morning-drive?past=1` lists the last 30 days;
  picking one loads it in read-only mode (answers revealed, no attempt
  logging).

## Local dev

```bash
vercel env pull           # one-time, brings down dev secrets + OIDC token
vercel dev                # runs the API + serves /morning-drive
open http://localhost:3000/morning-drive
```

If you need to clear today's content and regenerate during testing:

```sql
delete from morning_drive_days where date = '2026-05-13';
delete from morning_drive_seen where date = '2026-05-13';
```
