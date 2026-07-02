-- =============================================
-- MyTrackList — Migrazione v3
-- Rimuove le policy vecchie e aggiunge le nuove tabelle
-- Incolla questo nell'SQL Editor e clicca Run
-- =============================================

-- Drop policy vecchie se esistono
drop policy if exists "shows_own"         on public.user_shows;
drop policy if exists "eps_own"           on public.user_episodes;
drop policy if exists "epd_own"           on public.episode_details;
drop policy if exists "sea_own"           on public.season_tracking;
drop policy if exists "prof_own"          on public.user_profiles;
drop policy if exists "prof_public"       on public.user_profiles;
drop policy if exists "fav_own"           on public.user_favorites;
drop policy if exists "fav_public"        on public.user_favorites;
drop policy if exists "lists_own"         on public.user_lists;
drop policy if exists "list_items_own"    on public.user_list_items;

-- Drop policy ancora più vecchie (dalla v1/v2)
drop policy if exists "Utenti vedono solo i propri show"      on public.user_shows;
drop policy if exists "Utenti vedono solo i propri episodi"   on public.user_episodes;
drop policy if exists "Profilo proprio"                        on public.user_profiles;
drop policy if exists "Profili pubblici visibili a tutti"      on public.user_profiles;
drop policy if exists "Favorites propri"                       on public.user_favorites;
drop policy if exists "Favorites pubblici visibili"            on public.user_favorites;
drop policy if exists "Episode details propri"                 on public.episode_details;

-- Crea nuove tabelle se non esistono
create table if not exists public.user_shows (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        references auth.users on delete cascade not null,
  tmdb_id          integer     not null,
  media_type       text        not null default 'tv',
  status           text        not null default 'plan_to_watch',
  rating           integer     check (rating >= 1 and rating <= 10),
  note             text,
  fav_character    text,
  main_platform    text,
  main_device      text,
  watch_count      integer     default 1,
  title            text        not null,
  original_title   text,
  poster_path      text,
  backdrop_path    text,
  first_air_year   integer,
  total_episodes   integer     default 0,
  episode_runtime  integer     default 25,
  genres           text,
  added_at         timestamptz default now(),
  updated_at       timestamptz default now(),
  unique(user_id, tmdb_id)
);

create table if not exists public.user_episodes (
  id             uuid        default gen_random_uuid() primary key,
  user_id        uuid        references auth.users on delete cascade not null,
  tmdb_show_id   integer     not null,
  season_number  integer     not null,
  episode_number integer     not null,
  watched_at     timestamptz default now(),
  unique(user_id, tmdb_show_id, season_number, episode_number)
);

create table if not exists public.episode_details (
  id             uuid        default gen_random_uuid() primary key,
  user_id        uuid        references auth.users on delete cascade not null,
  tmdb_show_id   integer     not null,
  season_number  integer     not null,
  episode_number integer     not null,
  rating         integer     check (rating >= 1 and rating <= 5),
  emotions       text,
  fav_character  text,
  platform       text,
  device         text,
  watch_count    integer     default 1,
  note           text,
  watched_date   date,
  updated_at     timestamptz default now(),
  unique(user_id, tmdb_show_id, season_number, episode_number)
);

create table if not exists public.season_tracking (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references auth.users on delete cascade not null,
  tmdb_show_id  integer     not null,
  season_number integer     not null,
  start_date    date,
  end_date      date,
  watch_count   integer     default 1,
  unique(user_id, tmdb_show_id, season_number)
);

create table if not exists public.user_profiles (
  id            uuid        references auth.users on delete cascade primary key,
  username      text        unique,
  display_name  text,
  bio           text        check (char_length(bio) <= 300),
  note          text        check (char_length(note) <= 500),
  avatar_url    text,
  banner_url    text,
  is_public     boolean     default true,
  social_tvtime text,
  social_mal    text,
  social_imdb   text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.user_favorites (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users on delete cascade not null,
  tmdb_id     integer     not null,
  title       text        not null,
  poster_path text,
  position    integer     default 0,
  unique(user_id, tmdb_id)
);

create table if not exists public.user_lists (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users on delete cascade not null,
  name        text        not null,
  description text,
  created_at  timestamptz default now()
);

create table if not exists public.user_list_items (
  id          uuid        default gen_random_uuid() primary key,
  list_id     uuid        references public.user_lists on delete cascade not null,
  user_id     uuid        references auth.users on delete cascade not null,
  tmdb_id     integer     not null,
  title       text        not null,
  poster_path text,
  added_at    timestamptz default now(),
  unique(list_id, tmdb_id)
);

-- Aggiungi colonne mancanti a tabelle già esistenti (ignora errori se già ci sono)
alter table public.user_shows add column if not exists fav_character  text;
alter table public.user_shows add column if not exists main_platform  text;
alter table public.user_shows add column if not exists main_device    text;
alter table public.user_shows add column if not exists watch_count    integer default 1;
alter table public.user_shows add column if not exists genres         text;
alter table public.user_profiles add column if not exists note        text check (char_length(note) <= 500);
alter table public.user_profiles add column if not exists social_tvtime text;
alter table public.user_profiles add column if not exists social_mal  text;
alter table public.user_profiles add column if not exists social_imdb text;

-- RLS
alter table public.user_shows       enable row level security;
alter table public.user_episodes    enable row level security;
alter table public.episode_details  enable row level security;
alter table public.season_tracking  enable row level security;
alter table public.user_profiles    enable row level security;
alter table public.user_favorites   enable row level security;
alter table public.user_lists       enable row level security;
alter table public.user_list_items  enable row level security;

-- Ricrea policy
create policy "shows_own"      on public.user_shows       for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "eps_own"        on public.user_episodes    for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "epd_own"        on public.episode_details  for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "sea_own"        on public.season_tracking  for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "prof_own"       on public.user_profiles    for all using (auth.uid()=id)      with check (auth.uid()=id);
create policy "prof_public"    on public.user_profiles    for select using (is_public=true);
create policy "fav_own"        on public.user_favorites   for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "fav_public"     on public.user_favorites   for select using (exists(select 1 from public.user_profiles p where p.id=user_id and p.is_public=true));
create policy "lists_own"      on public.user_lists       for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "list_items_own" on public.user_list_items  for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Indici
create index if not exists idx_shows_uid     on public.user_shows(user_id);
create index if not exists idx_shows_status  on public.user_shows(user_id, status);
create index if not exists idx_shows_type    on public.user_shows(user_id, media_type);
create index if not exists idx_eps_show      on public.user_episodes(user_id, tmdb_show_id);
create index if not exists idx_epd_show      on public.episode_details(user_id, tmdb_show_id);
create index if not exists idx_sea_show      on public.season_tracking(user_id, tmdb_show_id);
create index if not exists idx_prof_username on public.user_profiles(username);
create index if not exists idx_fav_user      on public.user_favorites(user_id, position);
create index if not exists idx_lists_user    on public.user_lists(user_id);
create index if not exists idx_litems_list   on public.user_list_items(list_id);
