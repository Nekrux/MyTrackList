# MyTrackList

Tracker personale di serie TV, anime e cartoni. PWA mobile-first.
Stack: React + Vite + React Router · Supabase · TMDB · OMDb (voti IMDb) · Jikan (voti MyAnimeList) · Cloudflare Pages.

Voti mostrati: **TMDB + IMDb + MAL** (MAL solo sugli anime).

---

## 1. Supabase (una volta sola)

1. Apri il progetto Supabase → **SQL Editor** → incolla tutto il contenuto di `schema.sql` → **Run**.
   Lo script fa **DROP + CREATE da zero**, imposta le RLS e le policy pubbliche, e lancia `notify pgrst, 'reload schema'` alla fine.
2. **Authentication → Providers → Email**: disattiva **Confirm email** (così registrandosi si entra subito).
3. Prendi da **Project Settings → API**: `Project URL` e `anon public key`.

## 2. Variabili d'ambiente

Copia `.env.example` in `.env` e riempi:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_TMDB_API_KEY=...      # themoviedb.org/settings/api (v3 "API Key")
VITE_OMDB_API_KEY=...      # omdbapi.com/apikey.aspx (free, 1000/giorno)
```

Jikan (MAL) non richiede chiave.

## 3. Sviluppo locale

```
npm install
npm run dev
```

## 4. Deploy su Cloudflare Pages

- **Push su GitHub** sovrascrivendo i file vecchi con questi.
- Su Cloudflare Pages, il progetto è già collegato al repo. Verifica le impostazioni di build:
  - Build command: `npm run build`
  - Output directory: `dist`
- In **Settings → Environment variables** imposta le 4 variabili `VITE_*` qui sopra (Production e Preview).
- Il file `public/_redirects` gestisce il routing SPA (link diretti come `/u/username` e `/show/123` funzionano anche al refresh).

---

## Note

- **Voti IMDb/MAL**: recuperati in modo best-effort quando aggiungi/apri una serie. Se OMDb/Jikan non rispondono, l'app continua a funzionare (nessun blocco).
- **Rewatch**: vive solo a livello di **stagione** (bottone nell'accordion). Il moltiplicatore ore è `1 + rivisioni`. La barra di progresso resta un conteggio semplice.
- **Import TVTime**: carica lo ZIP dell'export GDPR o il file `tracking-prod-records-v2.csv`. La **mappatura colonne è modificabile** nella pagina di import, quindi si adatta al formato reale. Importabili: serie, episodi visti, date, stato. Non importabili (non presenti nell'export TVTime): emozioni, personaggi preferiti, reazioni.
- Tutte le tabelle hanno RLS: ognuno vede solo i propri dati; i profili impostati come **pubblici** espongono in sola lettura shows, episodi, stagioni e preferite per la pagina `/u/username`.
