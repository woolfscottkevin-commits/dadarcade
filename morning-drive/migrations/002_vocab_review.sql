-- Morning Drive — Supabase migration #002
-- Adds per-item attempt tracking so Word Match can do real spaced repetition.
-- Idempotent: safe to re-run. Apply in Supabase Studio → SQL Editor → Run.

------------------------------------------------------------
-- Which specific item was attempted?
------------------------------------------------------------
-- Before this, `problem_key` was 'vocab_match_claire' — the SLOT, not the word.
-- That made it impossible to know which words a kid actually struggles with,
-- so review could never be targeted. `item_key` records the underlying item
-- (the vocab word, the geography answer) so we can resurface misses.
alter table morning_drive_attempts
  add column if not exists item_key text;

create index if not exists morning_drive_attempts_item_idx
  on morning_drive_attempts (kid, kind, item_key, created_at desc);
