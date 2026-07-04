// Icone social minimali, riconoscibili dalla forma/colore del marchio.
export function SocialIcon({ kind, size = 20 }) {
  if (kind === 'imdb') {
    return (
      <svg width={size + 8} height={size} viewBox="0 0 64 32">
        <rect width="64" height="32" fill="#f5c518" />
        <text x="32" y="23" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="18" fill="#000">IMDb</text>
      </svg>
    )
  }
  if (kind === 'mal') {
    return (
      <svg width={size + 8} height={size} viewBox="0 0 64 32">
        <rect width="64" height="32" fill="#2e51a2" />
        <text x="32" y="22" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="16" fill="#fff">MAL</text>
      </svg>
    )
  }
  // tvtime
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="14" rx="0" fill="#fbbf24" />
      <rect x="9" y="18" width="6" height="3" fill="#fbbf24" />
      <path d="M7 9h10M12 9v6" stroke="#1a1626" strokeWidth="2" />
    </svg>
  )
}
