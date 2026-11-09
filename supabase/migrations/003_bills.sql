create table bills(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  category text not null,
  period date not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'EUR',
  usage numeric(12,2),
  usage_unit text,
  note text,
  storage_path text,
  mime text,
  created_at timestamptz default now()
);
create index bills_user_cat_idx on bills(user_id, category, period desc);
alter table bills enable row level security;
create policy own_bills on bills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
