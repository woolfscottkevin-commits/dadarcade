-- Morning Drive — Supabase migration #005
-- Idempotent: safe to re-run.
--
-- History trivia becomes one question per kid, pitched at that child's grade,
-- rather than a shared "mixed difficulty" set.
--
-- The trivia already in the pool was written to the old spec — deliberately
-- mixed, so some of it is aimed at a 7-year-old and some at a 9-year-old, with
-- nothing recording which. Rather than guess a `kid` for each (and hand Claire
-- questions written for Connor), they are RETIRED: stamped as used on a past
-- date so the assembler skips them. Nothing is deleted, so this is reversible —
-- set used_on back to null to bring them out of retirement.
--
-- Fresh per-kid batches generate on the next top-up.

update morning_drive_pool
   set used_on = date '2026-01-01'
 where kind = 'trivia'
   and kid is null
   and used_on is null;
