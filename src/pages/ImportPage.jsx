import SectionHead from '../components/SectionHead'

export default function ImportPage() {
  return (
    <>
      <h1 className="page-title">IMPORT TVTIME</h1>
      <SectionHead title="EXPORT GDPR" tag="fase 4" />
      <div className="empty-state">
        <span className="overline">// in attesa</span>
        L'import dell'export TVTime (con anteprima dry-run obbligatoria)
        arriva con la Fase 4.
      </div>
    </>
  )
}
