// Badge social squadrati con colori brand: TVTime, IMDb, MyAnimeList
export default function SocialRow({ tvtime, imdb, mal }) {
  const links = [
    tvtime && { href: tvtime, cls: 'tvt', label: 'tv:time' },
    imdb && { href: imdb, cls: 'imdb', label: 'IMDb' },
    mal && { href: mal, cls: 'mal', label: 'MAL' },
  ].filter(Boolean)

  if (!links.length) return null

  return (
    <div className="social-row">
      {links.map((l) => (
        <a key={l.cls} className={`social-badge ${l.cls}`} href={l.href}
          target="_blank" rel="noreferrer noopener">
          {l.label}
        </a>
      ))}
    </div>
  )
}
