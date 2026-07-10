-- ============================================================
-- MyTrackList v3 — SCHEMA COMPLETO (unica fonte di verità)
-- Eseguire UNA volta per intero nel SQL Editor di Supabase.
-- Ricrea il database da zero: le tabelle esistenti vengono ELIMINATE.
-- ============================================================

-- ------------------------------------------------------------
-- 0) Pulizia preventiva: trigger/funzioni orfane su auth.users
--    (un trigger residuo ha già causato "permission denied for
--    schema public" in fase di registrazione — lezione appresa)
-- ------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists handle_new_user on auth.users;
drop trigger if exists on_auth_user_created_profile on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.on_auth_user_created() cascade;
drop function if exists public.create_profile_for_user() cascade;

-- Il profilo NON viene creato da trigger: lo crea l'app
-- nella schermata "Scegli username" dopo la registrazione.

-- ------------------------------------------------------------
-- 1) DROP delle tabelle applicative (ripartenza pulita confermata)
-- ------------------------------------------------------------
drop table if exists public.user_list_items cascade;
drop table if exists public.user_lists cascade;
drop table if exists public.user_favorites cascade;
drop table if exists public.season_tracking cascade;
drop table if exists public.episode_details cascade;
drop table if exists public.user_episodes cascade;
drop table if exists public.user_shows cascade;
drop table if exists public.user_profiles cascade;

drop view if exists public.v_show_progress;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.get_stats() cascade;
drop function if exists public.get_public_stats(text) cascade;

-- ------------------------------------------------------------
-- 2) GRANT di base sullo schema public
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 3) TABELLE
-- ------------------------------------------------------------

-- Profilo utente (id = auth.uid). Creato dall'app, non da trigger.
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique
    check (char_length(username) between 3 and 30 and username ~ '^[a-zA-Z0-9_]+$'),
  display_name text,
  bio text check (char_length(bio) <= 300),
  note text check (char_length(note) <= 500),
  avatar_url text,
  banner_url text,
  is_public boolean not null default false,
  social_tvtime text,
  social_mal text,
  social_imdb text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una riga per serie in libreria.
-- Vincolo UNIQUE per upsert: onConflict = 'user_id,tmdb_id' (in quest'ordine)
create table public.user_shows (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  tvdb_id integer,
  imdb_id text,
  mal_id integer,
  media_type text not null default 'serie'
    check (media_type in ('serie','anime','cartone')),
  status text not null default 'da_vedere'
    check (status in ('in_corso','completata','da_vedere','in_pausa','abbandonata')),
  rating integer check (rating between 1 and 10),
  note text,
  fav_character text,
  main_platform text,
  main_device text,
  title text not null,
  original_title text,
  poster_path text,
  backdrop_path text,
  first_air_year integer,
  total_episodes integer,
  episode_runtime integer,           -- durata media episodio in minuti (per le statistiche)
  genres text,                       -- array JSON serializzato, es. '["Dramma","Sci-Fi & Fantasy"]'
  rating_tmdb numeric(3,1),
  rating_imdb numeric(3,1),
  rating_mal numeric(4,2),
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tmdb_id)
);

-- Episodi visti, con rewatch PER EPISODIO.
-- onConflict = 'user_id,tmdb_show_id,season_number,episode_number'
create table public.user_episodes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_show_id integer not null,
  season_number integer not null,
  episode_number integer not null,
  watch_count integer not null default 1 check (watch_count >= 1),
  watched_at timestamptz not null default now(),
  unique (user_id, tmdb_show_id, season_number, episode_number)
);

-- Dettagli episodio (voto, emozioni, personaggio, ecc.)
-- Colonna "emotions" PLURALE. Voto intero 1–10 (mezze stelle già moltiplicate).
-- onConflict = 'user_id,tmdb_show_id,season_number,episode_number'
create table public.episode_details (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_show_id integer not null,
  season_number integer not null,
  episode_number integer not null,
  rating integer check (rating between 1 and 10),
  emotions text,                     -- array JSON serializzato, es. '["😍 Adorato","🔥 Epico"]'
  fav_character text,
  platform text,
  device text,
  note text,
  watched_date date,
  rating_imdb numeric(3,1),
  updated_at timestamptz not null default now(),
  unique (user_id, tmdb_show_id, season_number, episode_number)
);

-- Solo date inizio/fine per stagione (il rewatch vive in user_episodes).
-- onConflict = 'user_id,tmdb_show_id,season_number'
create table public.season_tracking (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_show_id integer not null,
  season_number integer not null,
  start_date date,
  end_date date,
  unique (user_id, tmdb_show_id, season_number)
);

-- Preferite: SENZA limite di quantità.
-- onConflict = 'user_id,tmdb_id'
create table public.user_favorites (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  "position" integer not null default 0,
  added_at timestamptz not null default now(),
  unique (user_id, tmdb_id)
);

-- Liste personalizzate
create table public.user_lists (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.user_list_items (
  id bigint generated always as identity primary key,
  list_id bigint not null references public.user_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  added_at timestamptz not null default now(),
  unique (list_id, tmdb_id)
);

-- ------------------------------------------------------------
-- 4) INDICI
-- ------------------------------------------------------------
create index idx_user_shows_user        on public.user_shows (user_id);
create index idx_user_episodes_user     on public.user_episodes (user_id, tmdb_show_id);
create index idx_episode_details_user   on public.episode_details (user_id, tmdb_show_id);
create index idx_season_tracking_user   on public.season_tracking (user_id, tmdb_show_id);
create index idx_user_favorites_user    on public.user_favorites (user_id);
create index idx_user_lists_user        on public.user_lists (user_id);
create index idx_user_list_items_list   on public.user_list_items (list_id);
create index idx_user_profiles_username on public.user_profiles (username);

-- ------------------------------------------------------------
-- 5) Trigger updated_at
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_user_profiles_updated
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

create trigger trg_user_shows_updated
  before update on public.user_shows
  for each row execute function public.set_updated_at();

create trigger trg_episode_details_updated
  before update on public.episode_details
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 6) ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.user_profiles   enable row level security;
alter table public.user_shows      enable row level security;
alter table public.user_episodes   enable row level security;
alter table public.episode_details enable row level security;
alter table public.season_tracking enable row level security;
alter table public.user_favorites  enable row level security;
alter table public.user_lists      enable row level security;
alter table public.user_list_items enable row level security;

-- Accesso completo del proprietario
create policy own_all on public.user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy own_all on public.user_shows
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy own_all on public.user_episodes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy own_all on public.episode_details
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy own_all on public.season_tracking
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy own_all on public.user_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy own_all on public.user_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy own_all on public.user_list_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lettura pubblica per il profilo /u/username (senza login)
create policy public_read on public.user_profiles
  for select using (is_public = true);

create policy public_read on public.user_shows
  for select using (exists (
    select 1 from public.user_profiles p
    where p.id = user_shows.user_id and p.is_public = true
  ));

create policy public_read on public.user_episodes
  for select using (exists (
    select 1 from public.user_profiles p
    where p.id = user_episodes.user_id and p.is_public = true
  ));

create policy public_read on public.season_tracking
  for select using (exists (
    select 1 from public.user_profiles p
    where p.id = season_tracking.user_id and p.is_public = true
  ));

create policy public_read on public.user_favorites
  for select using (true);

-- ------------------------------------------------------------
-- 7) Viste e funzioni statistiche (aggregazione lato DB:
--    con ~26.000 episodi i conteggi non si fanno nel client)
-- ------------------------------------------------------------

-- Progresso per serie (per Libreria/Home). security_invoker: valgono le RLS.
create view public.v_show_progress with (security_invoker = true) as
select
  user_id,
  tmdb_show_id,
  (count(*) filter (where season_number > 0))::int as watched,
  coalesce(sum(watch_count), 0)::int as watch_total,
  coalesce(min(watch_count) filter (where season_number > 0), 0)::int as min_wc
from public.user_episodes
group by user_id, tmdb_show_id;

-- Statistiche complete dell'utente autenticato (tab Statistiche).
create or replace function public.get_stats()
returns jsonb
language sql
stable
as $$
with
eps as (
  select ue.*, coalesce(us.episode_runtime, 0) as runtime
  from public.user_episodes ue
  left join public.user_shows us
    on us.user_id = ue.user_id and us.tmdb_id = ue.tmdb_show_id
  where ue.user_id = auth.uid()
),
det as (
  select * from public.episode_details where user_id = auth.uid()
),
shows as (
  select * from public.user_shows where user_id = auth.uid()
)
select jsonb_build_object(
  'totals', (select jsonb_build_object(
      'hours', round(coalesce(sum(runtime * watch_count), 0) / 60.0, 1),
      'days', count(distinct (watched_at at time zone 'utc')::date),
      'shows', (select count(*) from shows),
      'eps_unique', count(*),
      'eps_month', count(*) filter (where date_trunc('month', watched_at) = date_trunc('month', now())),
      'eps_total_wr', coalesce(sum(watch_count), 0),
      'rewatched_eps', count(*) filter (where watch_count > 1),
      'rewatch_total', coalesce(sum(watch_count - 1), 0),
      'avg_ep_rating', (select round(avg(rating), 1) from det where rating is not null)
    ) from eps),
  'hours_by_day', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'h', h) order by d), '[]'::jsonb)
    from (select (watched_at at time zone 'utc')::date as d,
                 round(sum(runtime * watch_count) / 60.0, 2) as h
          from eps group by 1) t),
  'eps_by_month', (select coalesce(jsonb_agg(jsonb_build_object('m', m, 'n', n) order by m), '[]'::jsonb)
    from (select to_char(date_trunc('month', watched_at), 'YYYY-MM') as m, count(*) as n
          from eps
          where watched_at >= date_trunc('month', now()) - interval '11 months'
          group by 1) t),
  'types', (select coalesce(jsonb_agg(jsonb_build_object('t', media_type, 'n', n)), '[]'::jsonb)
    from (select media_type, count(*) as n from shows group by 1) t),
  'genres', (select coalesce(jsonb_agg(jsonb_build_object('g', g, 'n', n)), '[]'::jsonb)
    from (select g, count(*) as n
          from shows, jsonb_array_elements_text(genres::jsonb) as g
          where genres is not null and left(genres, 1) = '['
          group by 1 order by 2 desc limit 8) t),
  'show_ratings', (select coalesce(jsonb_agg(jsonb_build_object('r', r, 'n', n)), '[]'::jsonb)
    from (select rating as r, count(*) as n from shows where rating is not null group by 1) t),
  'ep_ratings', (select coalesce(jsonb_agg(jsonb_build_object('r', r, 'n', n)), '[]'::jsonb)
    from (select rating as r, count(*) as n from det where rating is not null group by 1) t),
  'avg_ep_per_show', (select coalesce(jsonb_agg(jsonb_build_object('r', r, 'n', n)), '[]'::jsonb)
    from (select round(a)::int as r, count(*) as n
          from (select avg(rating) as a from det where rating is not null group by tmdb_show_id) x
          group by 1) t),
  'emotions', (select coalesce(jsonb_agg(jsonb_build_object('e', e, 'n', n)), '[]'::jsonb)
    from (select e, count(*) as n
          from det, jsonb_array_elements_text(emotions::jsonb) as e
          where emotions is not null and left(emotions, 1) = '['
          group by 1 order by 2 desc limit 8) t),
  'platforms', (select coalesce(jsonb_agg(jsonb_build_object('p', p, 'n', n)), '[]'::jsonb)
    from (select p, count(*) as n from (
            select platform as p from det where platform is not null
            union all
            select main_platform from shows where main_platform is not null
          ) x group by 1 order by 2 desc limit 6) t),
  'statuses', (select coalesce(jsonb_agg(jsonb_build_object('s', status, 'n', n)), '[]'::jsonb)
    from (select status, count(*) as n from shows group by 1) t),
  'top_shows', (select coalesce(jsonb_agg(jsonb_build_object(
        'tmdb_id', tmdb_id, 'title', title, 'poster_path', poster_path, 'rating', rating
      ) order by rating desc), '[]'::jsonb)
    from (select tmdb_id, title, poster_path, rating
          from shows where rating is not null
          order by rating desc, updated_at desc limit 5) t)
);
$$;

-- Statistiche ridotte per il profilo pubblico /u/username (senza login).
-- security definer: filtra da sé i soli profili is_public.
create or replace function public.get_public_stats(p_username text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with owner as (
  select id from public.user_profiles
  where username = p_username and is_public = true
),
shows as (
  select * from public.user_shows where user_id = (select id from owner)
),
eps as (
  select ue.*, coalesce(us.episode_runtime, 0) as runtime
  from public.user_episodes ue
  left join public.user_shows us
    on us.user_id = ue.user_id and us.tmdb_id = ue.tmdb_show_id
  where ue.user_id = (select id from owner)
)
select case when (select id from owner) is null then null else jsonb_build_object(
  'totals', (select jsonb_build_object(
      'hours', round(coalesce(sum(runtime * watch_count), 0) / 60.0),
      'shows', (select count(*) from shows),
      'completed', (select count(*) from shows where status = 'completata')
    ) from eps),
  'types', (select coalesce(jsonb_agg(jsonb_build_object('t', media_type, 'n', n)), '[]'::jsonb)
    from (select media_type, count(*) as n from shows group by 1) t),
  'genres', (select coalesce(jsonb_agg(jsonb_build_object('g', g, 'n', n)), '[]'::jsonb)
    from (select g, count(*) as n
          from shows, jsonb_array_elements_text(genres::jsonb) as g
          where genres is not null and left(genres, 1) = '['
          group by 1 order by 2 desc limit 8) t),
  'top_shows', (select coalesce(jsonb_agg(jsonb_build_object(
        'title', title, 'poster_path', poster_path, 'rating', rating
      ) order by rating desc), '[]'::jsonb)
    from (select title, poster_path, rating
          from shows where rating is not null
          order by rating desc, updated_at desc limit 5) t)
) end;
$$;

-- ------------------------------------------------------------
-- 8) GRANT finali (tabelle, sequenze, funzioni + default futuri)
-- ------------------------------------------------------------
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 9) Ricarica cache PostgREST (obbligatorio dopo ogni DDL)
-- ------------------------------------------------------------
notify pgrst, 'reload schema';
