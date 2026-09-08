-- Morning Drive — Supabase migration #004
-- Idempotent: safe to re-run.
--
-- "Octopuses have three hearts and blue blood" turned up in Today's News AND in
-- Fun Facts on the same morning, and had appeared on earlier days too. The pool's
-- unique index is on (kind, fingerprint), so it only ever stopped a repeat WITHIN
-- one kind — nothing prevented the same subject crossing tiles.
--
-- Items now carry a short subject tag ("octopus blood", "saturn rings") which is
-- checked when a day is assembled and fed back into batch prompts so the same
-- topic is not written twice.

alter table morning_drive_pool
  add column if not exists subject text;

create index if not exists morning_drive_pool_subject_idx
  on morning_drive_pool (subject)
  where subject is not null;

------------------------------------------------------------
-- Jokes become per-kid
------------------------------------------------------------
-- Both jokes one morning were Connor-level, because the pool served two from a
-- shared bucket. Jokes are now stocked per kid (one each), so the rows already
-- banked need their `kid` filled in from the level the model assigned. Without
-- this they sit in the pool with kid = null and are never claimed again.
update morning_drive_pool
   set kid = payload->>'level'
 where kind = 'joke'
   and kid is null
   and payload->>'level' in ('claire', 'connor');
