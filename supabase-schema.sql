-- =============================================
-- TVTrack — Supabase Schema
-- Incolla questo nell'SQL Editor di Supabase
-- =============================================

create table if not exists public.user_shows (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        references auth.users on delete cascade not null,
  tmdb_id         integer     not null,
  media_type      text        not null default 'tv',         -- 'tv' | 'anime' | 'cartoon'
  status          text        not null default 'plan_to_watch', -- 'watching' | 'completed' | 'plan_to_watch' | 'dropped' | 'paused'
  rating          integer     check (rating >= 1 and rating <= 10),
  note            text,
  -- Dati TMDB cachati (per non fare troppe chiamate API)
  title           text        not null,
  original_title  text,
  poster_path     text,
  backdrop_path   text,
  first_air_year  integer,
  total_episodes  integer     default 0,
  episode_runtime integer     default 25,                    -- minuti medi per episodio
  -- Aggiornato lato client
  added_at        timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id, tmdb_id)
);

create table if not exists public.user_episodes (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        references auth.users on delete cascade not null,
  tmdb_show_id    integer     not null,
  season_number   integer     not null,
  episode_number  integer     not null,
  watched_at      timestamptz default now(),
  unique(user_id, tmdb_show_id, season_number, episode_number)
);

-- Row Level Security
alter table public.user_shows   enable row level security;
alter table public.user_episodes enable row level security;

create policy "Utenti vedono solo i propri show"
  on public.user_shows for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Utenti vedono solo i propri episodi"
  on public.user_episodes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indici per performance
create index if not exists idx_user_shows_uid    on public.user_shows(user_id);
create index if not exists idx_user_shows_status on public.user_shows(user_id, status);
create index if not exists idx_user_eps_show     on public.user_episodes(user_id, tmdb_show_id);
