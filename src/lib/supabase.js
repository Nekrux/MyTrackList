import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Variabili Supabase mancanti. Controlla che VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY siano impostate (file .env in locale, o variabili d\'ambiente su Cloudflare Pages).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
