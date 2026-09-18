-- Transactions had no creation timestamp, so same-day transactions were tie-broken by
-- id (a random UUID with no relation to insertion order) when sorting "newest first".
alter table public.transactions add column created_at timestamptz not null default now();
