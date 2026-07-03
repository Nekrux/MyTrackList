export default function Spinner({ label }) {
  return (
    <div className="loading-screen">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div className="spinner" />
        {label && <span>{label}</span>}
      </div>
    </div>
  )
}
