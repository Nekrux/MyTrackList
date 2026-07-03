-- =========================================================
-- MyTrackList — Schema Supabase completo
-- Incolla tutto questo file in Supabase → SQL Editor → Run
-- =========================================================

-- ---------------------------------------------------------
-- user_profiles: profilo pubblico
-- ---------------------------------------------------------
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  bio text check (char_length(bio) <= 300),
  note text check (char_length(note) <= 500),
  avatar_url text,
  banner_url text,
  is_public boolean not null default true,
  social_tvtime text,
  social_mal text,
  social_imdb text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- user_shows: una riga per ogni serie aggiunta dall'utente
-- ---------------------------------------------------------
create table if not exists user_shows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null default 'tv' check (media_type in ('tv', 'anime', 'cartoon')),
  status text not null default 'planned' check (status in ('watching', 'completed', 'planned', 'paused', 'dropped')),
  rating numeric(3,1) check (rating >= 1 and rating <= 10),
  note text,
  fav_character text,
  main_platform text,
  main_device text,
  watch_count integer not null default 1,
  title text not null,
  original_title text,
  poster_path text,
  backdrop_path text,
  first_air_year integer,
  total_episodes integer,
  episode_runtime integer,
  genres text,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tmdb_id)
);

-- ---------------------------------------------------------
-- user_episodes: episodi marcati come visti
-- ---------------------------------------------------------
create table if not exists user_episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_show_id integer not null,
  season_number integer not null,
  episode_number integer not null,
  watched_at timestamptz not null default now(),
  unique (user_id, tmdb_show_id, season_number, episode_number)
);

-- ---------------------------------------------------------
-- episode_details: dettagli per ogni episodio visto
-- ---------------------------------------------------------
create table if not exists episode_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_show_id integer not null,
  season_number integer not null,
  episode_number integer not null,
  rating integer check (rating >= 1 and rating <= 5),
  emotions text,
  fav_character text,
  platform text,
  device text,
  watch_count integer not null default 1,
  note text,
  watched_date date,
  updated_at timestamptz not null default now(),
  unique (user_id, tmdb_show_id, season_number, episode_number)
);

-- ---------------------------------------------------------
-- season_tracking: date inizio/fine e rewatch per stagione
-- ---------------------------------------------------------
create table if not exists season_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_show_id integer not null,
  season_number integer not null,
  start_date date,
  end_date date,
  watch_count integer not null default 0,
  unique (user_id, tmdb_show_id, season_number)
);

-- ---------------------------------------------------------
-- user_favorites: fino a 6 serie preferite per il profilo
-- ---------------------------------------------------------
create table if not exists user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  position integer not null default 0,
  unique (user_id, tmdb_id)
);

-- ---------------------------------------------------------
-- user_lists: liste personalizzate
-- ---------------------------------------------------------
create table if not exists user_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- user_list_items: serie dentro le liste
-- ---------------------------------------------------------
create table if not exists user_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references user_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  added_at timestamptz not null default now(),
  unique (list_id, tmdb_id)
);

-- ---------------------------------------------------------
-- Indici utili
-- ---------------------------------------------------------
create index if not exists idx_user_shows_user on user_shows(user_id);
create index if not exists idx_user_episodes_user_show on user_episodes(user_id, tmdb_show_id);
create index if not exists idx_episode_details_user_show on episode_details(user_id, tmdb_show_id);
create index if not exists idx_season_tracking_user_show on season_tracking(user_id, tmdb_show_id);
create index if not exists idx_user_list_items_list on user_list_items(list_id);

-- =========================================================
-- Row Level Security
-- =========================================================
alter table user_profiles enable row level security;
alter table user_shows enable row level security;
alter table user_episodes enable row level security;
alter table episode_details enable row level security;
alter table season_tracking enable row level security;
alter table user_favorites enable row level security;
alter table user_lists enable row level security;
alter table user_list_items enable row level security;

-- user_profiles: leggibile da chiunque se pubblico, oppure dal proprietario; scrivibile solo dal proprietario
create policy "profiles_select_public_or_own" on user_profiles
  for select using (is_public = true or auth.uid() = id);
create policy "profiles_insert_own" on user_profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on user_profiles
  for update using (auth.uid() = id);
create policy "profiles_delete_own" on user_profiles
  for delete using (auth.uid() = id);

-- Tabelle private: solo il proprietario può leggere/scrivere
create policy "shows_all_own" on user_shows
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lettura pubblica aggiuntiva: se il profilo è pubblico, le sue serie sono
-- leggibili da chiunque (serve per le statistiche del profilo pubblico /u/username)
create policy "shows_select_public" on user_shows
  for select using (
    exists (select 1 from user_profiles p where p.id = user_shows.user_id and p.is_public = true)
  );

create policy "episodes_all_own" on user_episodes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "episode_details_all_own" on episode_details
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "season_tracking_all_own" on season_tracking
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_favorites: leggibile pubblicamente (serve per i profili pubblici), scrivibile solo dal proprietario
create policy "favorites_select_all" on user_favorites
  for select using (true);
create policy "favorites_write_own" on user_favorites
  for insert with check (auth.uid() = user_id);
create policy "favorites_update_own" on user_favorites
  for update using (auth.uid() = user_id);
create policy "favorites_delete_own" on user_favorites
  for delete using (auth.uid() = user_id);

-- user_lists e user_list_items: private, solo il proprietario
create policy "lists_all_own" on user_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "list_items_all_own" on user_list_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Fine schema
-- =========================================================
