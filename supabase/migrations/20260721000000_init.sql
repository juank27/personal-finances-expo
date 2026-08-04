-- Extensions
create extension if not exists pgcrypto;

-- ===================== ENUMS =====================
create type transaction_type as enum ('income', 'expense');
create type group_member_role as enum ('owner', 'member');
create type budget_period as enum ('monthly', 'weekly');
create type invitation_status as enum ('pending', 'accepted', 'rejected');

-- ===================== PROFILES =====================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===================== GROUPS =====================
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role group_member_role not null,
  unique (group_id, user_id)
);

create index group_members_group_id_idx on public.group_members (group_id);
create index group_members_user_id_idx on public.group_members (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  token text not null unique,
  status invitation_status not null default 'pending',
  expires_at timestamptz not null
);

create index invitations_group_id_idx on public.invitations (group_id);

-- ===================== CATEGORIES =====================
-- user_id null + is_default = true -> system default category, shown to every user.
-- archived_at set instead of hard delete, so historical transactions/budgets keep a valid reference.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  name text not null,
  icon text not null,
  type transaction_type not null,
  is_default boolean not null default false,
  archived_at timestamptz
);

create index categories_user_id_idx on public.categories (user_id);

-- ===================== TRANSACTIONS =====================
-- group_id null -> personal transaction; set -> group transaction (Fase 4).
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  type transaction_type not null,
  date date not null,
  note text
);

create index transactions_user_id_date_idx on public.transactions (user_id, date desc, id desc);
create index transactions_group_id_idx on public.transactions (group_id);
create index transactions_category_id_idx on public.transactions (category_id);

-- ===================== BUDGETS =====================
-- Modeled as one row per period instance (start_date/end_date), not a runtime calendar calculation,
-- so past periods keep their own amount_limit history.
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  amount_limit numeric(14, 2) not null check (amount_limit > 0),
  period budget_period not null,
  start_date date not null,
  end_date date not null check (end_date > start_date)
);

create index budgets_user_id_idx on public.budgets (user_id);
create index budgets_group_id_idx on public.budgets (group_id);
create index budgets_category_id_idx on public.budgets (category_id);

-- ===================== ROW LEVEL SECURITY =====================
-- Defense-in-depth only: the backend connects with the service-role key (bypasses RLS)
-- and enforces user_id/group_id filtering in application code. These policies protect
-- against any future direct-from-client access path.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.invitations enable row level security;

create policy "profiles_self" on public.profiles
  for select using (auth.uid() = id);

create policy "categories_read" on public.categories
  for select using (user_id is null or user_id = auth.uid());

create policy "categories_manage_own" on public.categories
  for all using (user_id = auth.uid());

create policy "transactions_own_or_group" on public.transactions
  for all using (
    user_id = auth.uid()
    or group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "budgets_own_or_group" on public.budgets
  for all using (
    user_id = auth.uid()
    or group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "groups_member" on public.groups
  for select using (
    owner_id = auth.uid()
    or id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "group_members_visible" on public.group_members
  for select using (
    user_id = auth.uid()
    or group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "invitations_visible" on public.invitations
  for select using (
    invited_by = auth.uid()
    or group_id in (select group_id from public.group_members where user_id = auth.uid())
  );
