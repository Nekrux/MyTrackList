# TVTrack

App personale per il tracking di serie TV, anime e cartoni.  
PWA installabile su Android, con sync cloud tramite Supabase.

---

## Stack

| Layer    | Tecnologia |
|----------|-----------|
| Frontend | React 18 + Vite + React Router |
| Dati show | TMDB API (gratuita) |
| Backend/Auth | Supabase (gratuito) |
| Hosting | Vercel (gratuito) |

---

## Setup — 5 passaggi

### 1. TMDB API Key
1. Vai su https://www.themoviedb.org e crea un account gratuito
2. Vai in *Impostazioni → API* e richiedi una chiave (scegli "Developer")
3. Copia la **API Key (v3 auth)**

### 2. Supabase
1. Crea un account gratuito su https://supabase.com
2. Crea un nuovo progetto
3. Vai in *SQL Editor* e incolla l'intero contenuto di `supabase-schema.sql`, poi clicca *Run*
4. Vai in *Project Settings → API* e copia:
   - **Project URL**
   - **anon public key**
5. (Facoltativo ma consigliato) In *Authentication → Email Templates*, personalizza le email

### 3. Configura le variabili d'ambiente
```bash
cp .env.example .env
```
Apri `.env` e compila i tre valori con quelli copiati sopra.

### 4. Installa e testa in locale
```bash
npm install
npm run dev
```
Apri http://localhost:5173 nel browser.

### 5. Deploy su Vercel
1. Crea un account gratuito su https://vercel.com
2. Importa il progetto da GitHub (o usa `vercel` CLI)
3. In *Project Settings → Environment Variables*, aggiungi le stesse 3 variabili di `.env`
4. Deploy fatto! Vercel ti darà un URL HTTPS (necessario per la PWA)

### Installare come app su Android
1. Apri l'URL di Vercel in Chrome su Android
2. Menu (⋮) → *Aggiungi a schermata Home*
3. Conferma — si installa come app nativa

---

## Struttura del progetto

```
src/
├── lib/
│   ├── supabase.js      # Client Supabase
│   └── tmdb.js          # Helper TMDB API
├── contexts/
│   └── AuthContext.jsx  # Gestione autenticazione
├── components/
│   ├── Layout.jsx       # Nav bottom + outlet
│   └── ShowCard.jsx     # Card serie in lista
├── pages/
│   ├── Auth.jsx         # Login / Registrazione
│   ├── Home.jsx         # Dashboard + Trending
│   ├── Search.jsx       # Ricerca TMDB
│   ├── Library.jsx      # Libreria per stato
│   ├── ShowDetail.jsx   # Dettaglio + episodi + note
│   └── Stats.jsx        # Statistiche personali
└── index.css            # Design system completo
```

---

## Funzionalità

- 🔍 **Ricerca** serie TV, anime e cartoni via TMDB
- 📺 **Tracking episodi** — marca episodi singoli o intera stagione con un tap
- 📚 **Libreria** per stato: In corso / Da vedere / Completate / In pausa / Abbandonate
- 🏷️ **Tipo** personalizzato per ogni serie (TV / Anime / Cartone)
- ⭐ **Voto** da 1 a 10
- 📝 **Note personali** per ogni serie
- 📊 **Statistiche** — ore totali, giorni, episodi questo mese, top rated
- 🔄 **Sync** multi-dispositivo tramite Supabase
- 📱 **PWA** — installabile su Android come app nativa
- 🌐 **Italiano** — UI e risultati TMDB in italiano

---

## Note tecniche

- I dati TMDB (titolo, poster, episodi) vengono cachati su Supabase al momento dell'aggiunta, per ridurre le chiamate API
- La RLS (Row Level Security) di Supabase garantisce che ogni utente veda solo i propri dati
- Il piano gratuito Supabase (500 MB DB + 2 GB bandwidth) è più che sufficiente per uso personale
