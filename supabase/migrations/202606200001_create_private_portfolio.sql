create table if not exists public.holdings (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  quantity numeric not null check (quantity >= 0),
  buy_price numeric not null check (buy_price >= 0),
  current_price numeric not null check (current_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  current_price numeric not null default 0,
  change numeric not null default 0,
  change_percent numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, code)
);

create table if not exists public.chart_drawings (
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_code text not null,
  period text not null,
  overlays jsonb not null default '[]'::jsonb check (jsonb_typeof(overlays) = 'array'),
  updated_at timestamptz not null default now(),
  primary key (user_id, stock_code, period)
);

create index if not exists holdings_user_id_idx on public.holdings(user_id);
create index if not exists watchlist_user_id_idx on public.watchlist(user_id);
create index if not exists chart_drawings_user_id_idx on public.chart_drawings(user_id);

alter table public.holdings enable row level security;
alter table public.watchlist enable row level security;
alter table public.chart_drawings enable row level security;

create policy "users manage own holdings" on public.holdings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users manage own watchlist" on public.watchlist
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users manage own drawings" on public.chart_drawings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.holdings, public.watchlist, public.chart_drawings from anon;
grant select, insert, update, delete on public.holdings, public.watchlist, public.chart_drawings to authenticated;
