create table if not exists public.exchange_links (
  slug text primary key,
  name text not null,
  rate integer not null default 0 check (rate between 0 and 100),
  pop integer not null default 0,
  url text not null,
  status text not null default 'active' check (status in ('active', 'paused')),
  type text not null default 'Crypto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.exchange_links enable row level security;
create index if not exists exchange_links_status_idx on public.exchange_links(status);
-- Import current data from data/links.json through the Supabase table editor or seed script.
