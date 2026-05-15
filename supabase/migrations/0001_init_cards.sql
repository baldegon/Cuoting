create extension if not exists "pgcrypto";

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  visible_name text not null,
  brand text not null,
  issuer_bank text not null,
  closing_day smallint not null check (closing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  created_at timestamptz not null default now()
);

alter table public.cards enable row level security;

create policy "Users can read own cards"
  on public.cards
  for select
  using (auth.uid() = user_id);

create policy "Users can create own cards"
  on public.cards
  for insert
  with check (auth.uid() = user_id);
