-- =====================================================================
-- MyTrackList — schema completo v2 (RIFACIMENTO PULITO)
-- Esegui TUTTO questo file, UNA volta, in Supabase -> SQL Editor -> Run.
-- Alla fine c'è NOTIFY pgrst per rinfrescare la cache dello schema (lezione #4).
-- =====================================================================

-- ---------- 0. DROP pulito delle vecchie tabelle app ----------
-- (Scelta: ripartenza da zero. Non tocca auth.* né altro.)
drop table if exists user_list_items cascade;
drop table if exists user_lists       cascade;
drop table if exists user_favorites   cascade;
drop table if exists season_tracking  cascade;
drop table if exists episode_details  cascade;
drop table if exists user_episodes    cascade;
drop table if exists user_shows       cascade;
drop table if exists user_profiles    cascade;

-- ---------- 1. user_profiles ----------
create table user_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text,
  bio           text check (char_length(bio)  <= 300),
  note          text check (char_length(note) <= 500),
  avatar_url    text,
  banner_url    text,
  is_public     boolean not null default false,
  social_tvtime text,
  social_mal    text,
  social_imdb   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- 2. user_shows ----------
create table user_shows (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  tmdb_id        integer not null,
  media_type     text not null default 'tv',          -- 'tv'
  status         text not null default 'da_vedere',   -- in_corso|completata|da_vedere|in_pausa|abbandonata
  show_type      text not null default 'serie',       -- serie|anime|cartone
  rating         integer check (rating between 1 and 10),
  note           text,
  fav_character  text,
  main_platform  text,
  main_device    text,
  watch_count    integer not null default 0,          -- rewatch complessivo opzionale della serie (NON usato per stats)
  title          text,
  original_title text,
  poster_path    text,
  backdrop_path  text,
  first_air_year integer,
  total_episodes integer,
  episode_runtime integer,                            -- minuti (durata media episodio)
  genres         text,                                -- JSON string: ["Dramma","Sci-Fi & Fantasy"]
  imdb_rating    numeric(3,1),                        -- OMDb attivo
  mal_id         integer,                             -- MAL attivo (solo anime)
  mal_rating     numeric(4,2),                        -- MAL attivo (voto serie)
  added_at       timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, tmdb_id, media_type)
);
create index user_shows_user_idx on user_shows(user_id);
create index user_shows_tmdb_idx on user_shows(user_id, tmdb_id);

-- ---------- 3. user_episodes (presenza riga = episodio visto) ----------
create table user_episodes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  tmdb_show_id   integer not null,
  season_number  integer not null,
  episode_number integer not null,
  watched_at     date not null default current_date,
  unique (user_id, tmdb_show_id, season_number, episode_number)
);
create index user_episodes_user_show_idx on user_episodes(user_id, tmdb_show_id);
create index user_episodes_date_idx on user_episodes(user_id, watched_at);

-- ---------- 4. episode_details (dettagli per episodio valutato/annotato) ----------
create table episode_details (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  tmdb_show_id   integer not null,
  season_number  integer not null,
  episode_number integer not null,
  rating         integer check (rating between 1 and 10),   -- base 10 diretta (5 stelle, mezze incluse)
  emotions       text,                                       -- JSON array string (PLURALE): ["🔥","😢"]
  fav_character  text,                                        -- nome PERSONAGGIO (non attore)
  platform       text,
  device         text,
  note           text,
  watched_date   date,
  imdb_rating    numeric(3,1),                                -- OMDb attivo (voto episodio)
  updated_at     timestamptz not null default now(),
  unique (user_id, tmdb_show_id, season_number, episode_number)
);
create index episode_details_user_show_idx on episode_details(user_id, tmdb_show_id);
-- NOTA: nessuna colonna watch_count qui. Il rewatch vive SOLO in season_tracking.

-- ---------- 5. season_tracking (date + rewatch per stagione) ----------
create table season_tracking (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  tmdb_show_id  integer not null,
  season_number integer not null,
  start_date    date,
  end_date      date,
  watch_count   integer not null default 0,   -- RIVISIONI oltre la prima. Moltiplicatore ovunque = (1 + watch_count)
  unique (user_id, tmdb_show_id, season_number)
);
create index season_tracking_user_show_idx on season_tracking(user_id, tmdb_show_id);

-- ---------- 6. user_favorites (max 6, gestito lato app) ----------
create table user_favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tmdb_id     integer not null,
  title       text,
  poster_path text,
  position    integer not null default 0,
  unique (user_id, tmdb_id)
);
create index user_favorites_user_idx on user_favorites(user_id);

-- ---------- 7. user_lists ----------
create table user_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);
create index user_lists_user_idx on user_lists(user_id);

-- ---------- 8. user_list_items ----------
create table user_list_items (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references user_lists(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  tmdb_id     integer not null,
  title       text,
  poster_path text,
  added_at    timestamptz not null default now(),
  unique (list_id, tmdb_id)
);
create index user_list_items_list_idx on user_list_items(list_id);

-- =====================================================================
-- RLS
-- =====================================================================
alter table user_profiles   enable row level security;
alter table user_shows      enable row level security;
alter table user_episodes   enable row level security;
alter table episode_details enable row level security;
alter table season_tracking enable row level security;
alter table user_favorites  enable row level security;
alter table user_lists      enable row level security;
alter table user_list_items enable row level security;

-- ---- Proprietario: full access sulle proprie righe ----
create policy "profiles_owner" on user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "shows_owner" on user_shows
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "episodes_owner" on user_episodes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "epdetails_owner" on episode_details
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "seasontrack_owner" on season_tracking
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "favorites_owner" on user_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lists_owner" on user_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "listitems_owner" on user_list_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- Lettura pubblica (profilo pubblico + statistiche su /u/username) ----
-- INCLUSE FIN DA SUBITO (lezione #6), non come migrazione successiva.
create policy "profiles_select_public" on user_profiles
  for select using (is_public = true);

create policy "shows_select_public" on user_shows
  for select using (
    exists (select 1 from user_profiles p where p.id = user_shows.user_id and p.is_public = true)
  );
create policy "episodes_select_public" on user_episodes
  for select using (
    exists (select 1 from user_profiles p where p.id = user_episodes.user_id and p.is_public = true)
  );
create policy "seasontrack_select_public" on season_tracking
  for select using (
    exists (select 1 from user_profiles p where p.id = season_tracking.user_id and p.is_public = true)
  );

-- user_favorites: lettura pubblica SEMPRE (griglia preferite nel profilo pubblico)
create policy "favorites_select_public" on user_favorites
  for select using (true);

-- =====================================================================
-- Ultimo passo OBBLIGATORIO: rinfresca la cache schema di PostgREST
-- =====================================================================
notify pgrst, 'reload schema';
