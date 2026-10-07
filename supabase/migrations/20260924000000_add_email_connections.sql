-- Gmail connection per user for the lazy sync of bank-notification emails. No push
-- notifications (Pub/Sub) because this backend has no public endpoint — see
-- email-sync.service.ts, which polls lazily from last_synced_at instead.
create table public.email_connections (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null,
  refresh_token_encrypted text not null,
  access_token_encrypted text,
  access_token_expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'error', 'revoked')),
  last_error text,
  last_synced_at timestamptz,
  sync_in_progress boolean not null default false,
  sync_started_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.email_connections enable row level security;

create policy "email_connections_self" on public.email_connections
  for all using (user_id = auth.uid());
