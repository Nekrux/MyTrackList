-- =============================================
-- MyTrackList — Supabase Schema v2
-- Incolla questo nell'SQL Editor DOPO il primo schema
-- =============================================

-- Profili utente
create table if not exists public.user_profiles (
  id            uuid        references auth.users on delete cascade primary key,
  username      text        unique,
  display_name  text,
  bio           text        check (char_length(bio) <= 200),
  avatar_url    text,
  banner_url    text,
  is_public     boolean     default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Dettagli episodi (rating, emozione, personaggio, piattaforma, volte viste)
create table if not exists public.episode_details (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        references auth.users on delete cascade not null,
  tmdb_show_id    integer     not null,
  season_number   integer     not null,
  episode_number  integer     not null,
  rating          integer     check (rating >= 1 and rating <= 5),
  emotion         text,
  fav_character   text,
  platform        text,
  watch_count     integer     default 1,
  note            text,
  updated_at      timestamptz default now(),
  unique(user_id, tmdb_show_id, season_number, episode_number)
);

-- Serie preferite (per il profilo)
create table if not exists public.user_favorites (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users on delete cascade not null,
  tmdb_id     integer     not null,
  title       text        not null,
  poster_path text,
  position    integer     default 0,
  unique(user_id, tmdb_id)
);

-- Aggiunte a user_shows
alter table public.user_shows
  add column if not exists fav_character  text,
  add column if not exists main_platform  text,
  add column if not exists watch_count    integer default 1;

-- RLS
alter table public.user_profiles   enable row level security;
alter table public.episode_details enable row level security;
alter table public.user_favorites  enable row level security;

-- Profili: ognuno gestisce il proprio; i profili pubblici sono leggibili da tutti
create policy "Profilo proprio"
  on public.user_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Profili pubblici visibili a tutti"
  on public.user_profiles for select
  using (is_public = true);

create policy "Favorites propri"
  on public.user_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Favorites pubblici visibili"
  on public.user_favorites for select
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = user_id and p.is_public = true
    )
  );

create policy "Episode details propri"
  on public.episode_details for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Username deve essere lowercase senza spazi
create or replace function public.sanitize_username()
returns trigger language plpgsql as $$
begin
  new.username = lower(regexp_replace(new.username, '[^a-z0-9_]', '', 'g'));
  return new;
end;
$$;

create trigger before_insert_profile
  before insert or update on public.user_profiles
  for each row execute procedure public.sanitize_username();

-- Indici
create index if not exists idx_profiles_username  on public.user_profiles(username);
create index if not exists idx_ep_details_show    on public.episode_details(user_id, tmdb_show_id);
create index if not exists idx_favorites_user     on public.user_favorites(user_id, position);
