-- Accounts and Daily Wave rankings.
-- Both tables are server-only: row level security is on with no policies, and the
-- API roles have no grants, so the browser can never read or write them directly.
-- Every read and write goes through the app's API routes, which check the ride.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null check (handle ~ '^[A-Za-z0-9_-]{3,16}$'),
  created_at timestamptz not null default now()
);

-- "Kelly" and "kelly" can't both exist.
create unique index profiles_handle_unique on public.profiles (lower(handle));

create table public.daily_rides (
  user_id uuid not null references public.profiles (id) on delete cascade,
  wave_date date not null,
  -- Set by the server when the player paddles out. This is what makes one ride a day stick.
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  won boolean,
  ms integer check (ms >= 0),
  percent smallint check (percent between 0 and 100),
  moves jsonb,
  primary key (user_id, wave_date)
);

create index daily_rides_rankings on public.daily_rides (wave_date, ms) where won;

alter table public.profiles enable row level security;
alter table public.daily_rides enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.daily_rides from anon, authenticated;
