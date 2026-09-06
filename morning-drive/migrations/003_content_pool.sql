-- Morning Drive — Supabase migration #003
-- The content bank. Idempotent: safe to re-run.
--
-- WHY THIS EXISTS
-- The nightly prompt had grown to ~50,000 input tokens, and 91% of that was the
-- "do not repeat these" block — re-sending everything the model had ever written
-- so it wouldn't say it again. That is what a uniqueness constraint is for.
--
-- Almost all Morning Drive content is evergreen: a joke, a riddle, a Bible
-- verse, a flag question about Japan are no less good for having been generated
-- six weeks earlier. So items are generated in BATCHES into this pool, and the
-- nightly job assembles a day out of it in pure code. Most mornings make no
-- model call at all.

create table if not exists morning_drive_pool (
  id           bigserial primary key,
  kind         text not null,      -- 'joke' | 'riddle' | 'math' | 'artwork' | ...
  kid          text,               -- 'claire' | 'connor'; null for shared items
  slot         text,               -- 'MM-DD' for date-locked kinds (On This Day)
  payload      jsonb not null,     -- the item, already media-resolved if applicable
  fingerprint  text not null,      -- normalised hash, dedupe within a kind
  used_on      date,               -- null = still available
  created_at   timestamptz not null default now(),
  unique (kind, fingerprint)
);

-- The hot path: "give me N unused items of this kind for this kid".
create index if not exists morning_drive_pool_available_idx
  on morning_drive_pool (kind, kid, id)
  where used_on is null;

-- Date-locked lookups (On This Day).
create index if not exists morning_drive_pool_slot_idx
  on morning_drive_pool (kind, slot)
  where used_on is null;

-- For reporting which day consumed what.
create index if not exists morning_drive_pool_used_idx
  on morning_drive_pool (used_on);

alter table morning_drive_pool enable row level security;

-- Writes are service-role only (which bypasses RLS). The page never reads the
-- pool directly — it only ever sees the assembled day in morning_drive_days —
-- so anon needs no policy here at all. Deliberately no "anon can read" policy:
-- the pool holds unused answers, and a curious kid with the network tab open
-- should not be able to read tomorrow's questions.
