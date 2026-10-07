-- Distinguishes transactions created manually from ones auto-registered by the
-- email-sync AI pipeline, and gives the pipeline an idempotency key per Gmail message.
alter table public.transactions
  add column source text not null default 'manual' check (source in ('manual', 'email-ai')),
  add column source_message_id text;

-- Partial unique index: only constrains email-ai rows (manual transactions always have
-- source_message_id null, so they never collide with each other here).
create unique index transactions_source_message_id_idx
  on public.transactions (source_message_id)
  where source_message_id is not null;
