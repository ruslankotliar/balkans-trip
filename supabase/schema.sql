-- Balkans trip — collaboration tables (votes, comments, friend-added places)
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- No RLS by design: 4 friends, non-sensitive trip votes; the publishable key is
-- public anyway. Security via obscurity of the project URL is acceptable here.

-- one 👍/👎 per person per place (upsert on the primary key)
create table if not exists public.votes (
  place_id   text not null,
  person     text not null,
  vote       smallint not null check (vote in (-1, 1)),
  updated_at timestamptz not null default now(),
  primary key (place_id, person)
);

-- append-only comments
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  place_id   text not null,
  person     text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

-- friend-added places (full Place object as JSON, synced to all phones)
create table if not exists public.user_places (
  id         text primary key,
  data       jsonb not null,
  added_by   text,
  created_at timestamptz not null default now()
);

-- open read/write for the app (no RLS)
grant all on table public.votes, public.comments, public.user_places to anon, authenticated;
