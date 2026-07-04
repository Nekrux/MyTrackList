import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  // Messaggio esplicito: un errore vero costa meno di un debug alla cieca (lezione #2)
  console.error('Config mancante: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY non impostate.')
}

export const supabase = createClient(url || 'http://localhost', key || 'anon', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
