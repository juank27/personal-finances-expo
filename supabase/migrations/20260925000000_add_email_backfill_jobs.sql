-- On-demand historical import of bank-notification emails by date range ("Parte 3").
-- Separate job table from email_connections: a long date range can mean hundreds of
-- messages, so it runs as a background job with its own progress state instead of a
-- single synchronous request — see email-backfill.service.ts.
create table public.email_backfill_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date_from date not null,
  date_to date not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  total_messages int,
  processed int not null default 0,
  imported int not null default 0,
  skipped int not null default 0,
  errors int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.email_backfill_jobs enable row level security;

create policy "email_backfill_jobs_self" on public.email_backfill_jobs
  for all using (user_id = auth.uid());
