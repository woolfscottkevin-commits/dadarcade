-- Morning Drive — Supabase migration #001
-- Apply by pasting into Supabase Studio → SQL Editor on the existing dadarcade project
-- (https://momzrpcwlnakargfhexf.supabase.co), or via `supabase db push` if you've wired
-- the local CLI. Idempotent: safe to re-run.

------------------------------------------------------------
-- Tables
------------------------------------------------------------

-- One row per day, full content blob. Idempotent on date.
create table if not exists morning_drive_days (
  date          date primary key,
  payload       jsonb not null,
  generated_by  text not null default 'cron',  -- 'cron' | 'on-demand-fallback'
  created_at    timestamptz not null default now()
);

-- Append-only "we've shown this before" log. Powers the never-repeat filter.
create table if not exists morning_drive_seen (
  id           bigserial primary key,
  kind         text not null,   -- 'word' | 'fact' | 'news' | 'math' | 'trivia' | 'joke' | 'wyr' | 'vocab_match'
  fingerprint  text not null,   -- normalized hash of the prompt text
  date         date not null,
  created_at   timestamptz not null default now(),
  unique (kind, fingerprint)
);
create index if not exists morning_drive_seen_kind_date_idx
  on morning_drive_seen (kind, date desc);

-- Per-attempt log for difficulty tuning.
create table if not exists morning_drive_attempts (
  id           bigserial primary key,
  date         date not null,
  kid          text not null,   -- 'claire' | 'connor'
  kind         text not null,   -- 'math' | 'vocab_match'
  problem_key  text not null,   -- e.g., 'math_3', 'vocab_match_claire'
  topic        text,            -- e.g., 'subtraction-regrouping', 'fractions', 'vocab-definition'
  attempts     int not null,    -- 1 = first try, higher = wrong taps + 1 final correct
  correct      boolean not null,
  created_at   timestamptz not null default now()
);
create index if not exists morning_drive_attempts_kid_topic_idx
  on morning_drive_attempts (kid, kind, topic, created_at desc);

------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------
alter table morning_drive_days     enable row level security;
alter table morning_drive_seen     enable row level security;
alter table morning_drive_attempts enable row level security;

-- Allow anon to SELECT the days payload so the page can show "Past Days" without
-- a service-role roundtrip if we want to skip the API later. Writes go through
-- the service role only.
drop policy if exists "anon can read days" on morning_drive_days;
create policy "anon can read days"
  on morning_drive_days
  for select
  to anon
  using (true);

-- All writes go through the service role; no explicit policies needed since
-- service_role bypasses RLS. Anon has no other access.
