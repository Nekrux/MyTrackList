-- =========================================================
-- MyTrackList — Migrazione incrementale
-- Da eseguire UNA VOLTA su un progetto Supabase già configurato
-- con lo schema.sql originale (non serve rieseguire tutto schema.sql).
-- Supabase → SQL Editor → incolla ed esegui.
-- =========================================================

-- Permette la lettura pubblica di user_episodes quando il profilo è pubblico
-- (serve per calcolare correttamente le ore totali nel profilo pubblico /u/username)
create policy "episodes_select_public" on user_episodes
  for select using (
    exists (select 1 from user_profiles p where p.id = user_episodes.user_id and p.is_public = true)
  );

-- Permette la lettura pubblica di season_tracking quando il profilo è pubblico
-- (serve per applicare il moltiplicatore dei rewatch nelle ore totali pubbliche)
create policy "season_tracking_select_public" on season_tracking
  for select using (
    exists (select 1 from user_profiles p where p.id = season_tracking.user_id and p.is_public = true)
  );
