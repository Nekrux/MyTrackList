import { supabase } from './supabase'

// Ogni onConflict elenca ESATTAMENTE le colonne del vincolo UNIQUE, nello stesso ordine (lezione #7).

export async function getUserShow(userId, tmdbId) {
  const { data, error } = await supabase.from('user_shows')
    .select('*').eq('user_id', userId).eq('tmdb_id', tmdbId).eq('media_type', 'tv').maybeSingle()
  if (error) throw error
  return data
}

export async function upsertShow(row) {
  const { data, error } = await supabase.from('user_shows')
    .upsert({ ...row, media_type: 'tv', updated_at: new Date().toISOString() }, { onConflict: 'user_id,tmdb_id,media_type' })
    .select().single()
  if (error) throw error
  return data
}

export async function deleteShow(userId, tmdbId) {
  const { error } = await supabase.from('user_shows')
    .delete().eq('user_id', userId).eq('tmdb_id', tmdbId).eq('media_type', 'tv')
  if (error) throw error
}

export async function listShows(userId) {
  const { data, error } = await supabase.from('user_shows').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

// --- episodi visti ---
export async function getWatchedEpisodes(userId, showId) {
  const { data, error } = await supabase.from('user_episodes')
    .select('*').eq('user_id', userId).eq('tmdb_show_id', showId)
  if (error) throw error
  return data || []
}
export async function markEpisode(userId, showId, s, e, watchedAt) {
  const { error } = await supabase.from('user_episodes')
    .upsert({ user_id: userId, tmdb_show_id: showId, season_number: s, episode_number: e, watched_at: watchedAt || new Date().toISOString().slice(0, 10) },
      { onConflict: 'user_id,tmdb_show_id,season_number,episode_number' })
  if (error) throw error
}
export async function unmarkEpisode(userId, showId, s, e) {
  const { error } = await supabase.from('user_episodes')
    .delete().eq('user_id', userId).eq('tmdb_show_id', showId).eq('season_number', s).eq('episode_number', e)
  if (error) throw error
}

// --- dettagli episodio ---
export async function getEpisodeDetails(userId, showId) {
  const { data, error } = await supabase.from('episode_details')
    .select('*').eq('user_id', userId).eq('tmdb_show_id', showId)
  if (error) throw error
  return data || []
}
export async function upsertEpisodeDetails(row) {
  const { data, error } = await supabase.from('episode_details')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id,tmdb_show_id,season_number,episode_number' })
    .select().single()
  if (error) throw error
  return data
}

// --- season tracking ---
export async function getSeasonTracking(userId, showId) {
  const { data, error } = await supabase.from('season_tracking')
    .select('*').eq('user_id', userId).eq('tmdb_show_id', showId)
  if (error) throw error
  return data || []
}
export async function upsertSeasonTracking(row) {
  const { data, error } = await supabase.from('season_tracking')
    .upsert(row, { onConflict: 'user_id,tmdb_show_id,season_number' })
    .select().single()
  if (error) throw error
  return data
}

// --- preferiti ---
export async function listFavorites(userId) {
  const { data, error } = await supabase.from('user_favorites')
    .select('*').eq('user_id', userId).order('position', { ascending: true })
  if (error) throw error
  return data || []
}
export async function addFavorite(userId, show, position) {
  const { error } = await supabase.from('user_favorites')
    .upsert({ user_id: userId, tmdb_id: show.tmdb_id, title: show.title, poster_path: show.poster_path, position: position ?? 0 },
      { onConflict: 'user_id,tmdb_id' })
  if (error) throw error
}
export async function removeFavorite(userId, tmdbId) {
  const { error } = await supabase.from('user_favorites').delete().eq('user_id', userId).eq('tmdb_id', tmdbId)
  if (error) throw error
}
