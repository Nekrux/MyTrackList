export default function SectionHead({ title, tag, children }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      <span className="rule" />
      {tag && <span className="tag">{tag}</span>}
      {children}
    </div>
  )
}
