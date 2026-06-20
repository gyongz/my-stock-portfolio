create table if not exists public.chart_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{"preferences":{},"views":{}}'::jsonb
    check (jsonb_typeof(preferences) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.chart_preferences enable row level security;

create policy "users manage own chart preferences" on public.chart_preferences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.chart_preferences from anon;
grant select, insert, update, delete on public.chart_preferences to authenticated;
