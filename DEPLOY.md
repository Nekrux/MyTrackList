# MyTrackList v3 — Deploy Fase 1

## 1. Database (Supabase)
1. Apri il progetto Supabase → **SQL Editor** → nuova query.
2. Incolla TUTTO il contenuto di `schema.sql` ed esegui **Run** una sola volta.
   ⚠️ Elimina e ricrea tutte le tabelle (ripartenza pulita confermata).
3. Deve terminare con "Success". Il `NOTIFY pgrst` finale è già incluso.

## 2. Repository (GitHub)
1. Nel repo, elimina le vecchie cartelle `src` e `public`
   (apri la cartella → menu "···" → *Delete directory* → commit).
2. Carica i file nuovi via drag & drop mantenendo la struttura:
   - `index.html`, `package.json`, `vite.config.js`, `.gitignore`, `schema.sql`
   - cartella `public/` completa
   - cartella `src/` completa
3. ⚠️ Conferma la sovrascrittura di OGNI file quando GitHub lo chiede.

## 3. Cloudflare Pages
1. Settings → **Variables and Secrets** (Production): verifica/aggiungi
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - (`VITE_TMDB_API_KEY`, `VITE_OMDB_API_KEY` serviranno dalla Fase 2;
     `VITE_TVDB_API_KEY` e `VITE_TVDB_PIN` dalla Fase 4 — puoi già inserirle)
2. Il push su GitHub avvia la build automatica (`npm run build`, output `dist`).
3. Controlla **Deployments** → deve risultare verde.

## 4. Verifica
1. Apri il sito → Registrati (se la conferma email è attiva, apri il link e accedi).
2. Scegli l'username → arrivi in Home.
3. Profilo → attiva "Profilo pubblico" → Copia link → aprilo in finestra
   anonima: deve mostrare il profilo senza login.
4. Esci e riaccedi per verificare il login.
