create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  total_amount numeric(12, 2) not null check (total_amount > 0),
  purchase_date date not null,
  installments_count smallint not null check (installments_count between 1 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_allocations (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.installment_plans (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.purchase_allocations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  installments_count smallint not null check (installments_count between 1 and 120),
  frequency text not null default 'monthly' check (frequency = 'monthly'),
  start_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.installment_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  installment_number smallint not null check (installment_number >= 1),
  due_date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (plan_id, installment_number)
);

create index if not exists purchases_user_id_idx on public.purchases(user_id);
create index if not exists purchase_allocations_purchase_id_idx on public.purchase_allocations(purchase_id);
create index if not exists purchase_allocations_user_id_idx on public.purchase_allocations(user_id);
create index if not exists installment_plans_allocation_id_idx on public.installment_plans(allocation_id);
create index if not exists installment_plans_user_id_idx on public.installment_plans(user_id);
create index if not exists installments_plan_id_idx on public.installments(plan_id);
create index if not exists installments_user_id_idx on public.installments(user_id);
create index if not exists installments_status_idx on public.installments(status);

alter table public.purchases enable row level security;
alter table public.purchase_allocations enable row level security;
alter table public.installment_plans enable row level security;
alter table public.installments enable row level security;

create policy "Users can read own purchases"
  on public.purchases
  for select
  using (auth.uid() = user_id);

create policy "Users can create own purchases"
  on public.purchases
  for insert
  with check (auth.uid() = user_id);

create policy "Users can read own purchase allocations"
  on public.purchase_allocations
  for select
  using (auth.uid() = user_id);

create policy "Users can create own purchase allocations"
  on public.purchase_allocations
  for insert
  with check (auth.uid() = user_id);

create policy "Users can read own installment plans"
  on public.installment_plans
  for select
  using (auth.uid() = user_id);

create policy "Users can create own installment plans"
  on public.installment_plans
  for insert
  with check (auth.uid() = user_id);

create policy "Users can read own installments"
  on public.installments
  for select
  using (auth.uid() = user_id);

create policy "Users can create own installments"
  on public.installments
  for insert
  with check (auth.uid() = user_id);
