# MyTrackList

Web app personale per il tracking di serie TV, anime e cartoni. PWA installabile su Android.

## Come mettere online l'app (senza scrivere codice)

### 1. Crea il database su Supabase
1. Vai su [supabase.com](https://supabase.com) e crea un account/progetto gratuito.
2. Nel progetto, apri **SQL Editor** (menu a sinistra).
3. Apri il file `schema.sql` incluso in questa cartella, copia tutto il contenuto e incollalo nell'SQL Editor.
4. Premi **Run**. Dovresti vedere "Success" — questo crea tutte le tabelle necessarie.
5. Vai su **Authentication → Providers → Email** e disattiva **"Confirm email"** (così potrai accedere subito senza dover confermare l'email).
6. Vai su **Project Settings → API**: ti servono l'**URL** del progetto e la chiave **anon public**.

### 2. Prendi una API key gratuita da TMDB
1. Registrati su [themoviedb.org](https://www.themoviedb.org).
2. Vai su Impostazioni → API e richiedi una API key (v3 auth).

### 3. Carica il progetto su GitHub
1. Crea un account su [github.com](https://github.com) se non lo hai già.
2. Crea un nuovo repository (es. "mytracklist").
3. Trascina **tutti i file e le cartelle** di questo progetto nella pagina di GitHub per caricarli (drag & drop).
4. **Non caricare il file `.env`** se lo crei — solo `.env.example`. Le chiavi vere vanno inserite su Cloudflare (punto 4).

### 4. Collega il progetto a Cloudflare Pages
1. Vai su [pages.cloudflare.com](https://pages.cloudflare.com) e crea un account gratuito.
2. Crea un nuovo progetto → **Connect to Git** → seleziona il repository GitHub appena creato.
3. Impostazioni di build:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Prima di avviare il deploy, vai su **Settings → Environment variables** e aggiungi:
   - `VITE_SUPABASE_URL` = l'URL del tuo progetto Supabase
   - `VITE_SUPABASE_ANON_KEY` = la chiave anon public di Supabase
   - `VITE_TMDB_API_KEY` = la tua API key di TMDB
5. Avvia il deploy. Dopo qualche minuto la tua app sarà online su un indirizzo tipo `mytracklist.pages.dev`.

### 5. Installa l'app su Android
Apri il link dell'app con Chrome su Android → menu (⋮) → **"Installa app"** (o "Aggiungi a schermata Home").

---

## Sviluppo in locale (opzionale, solo se vuoi modificare il codice)

```bash
npm install
cp .env.example .env   # poi inserisci le tue chiavi nel file .env
npm run dev
```

## Struttura del progetto

- `schema.sql` — schema del database Supabase (tabelle + sicurezza a livello di riga)
- `src/pages/` — le pagine dell'app (Home, Cerca, Libreria, Liste, Profilo, ecc.)
- `src/components/` — componenti riutilizzabili (card serie, sheet episodio, grafici statistiche, ecc.)
- `src/lib/` — client Supabase e TMDB, funzioni statistiche
- `src/index.css` — stile globale (tema Catppuccin Mocha Mauve, angoli squadrati, oro come accento)
