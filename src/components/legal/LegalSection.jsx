/**
 * One numbered section of a legal page (Terms/Privacy) — a heading with a
 * scroll-margin so in-page anchor links (see the contents list on each page)
 * land below the fixed navbar, plus a consistently spaced body. Shared by
 * routes/Terms.jsx and routes/Privacy.jsx so both documents read as one
 * system rather than drifting apart heading-by-heading.
 */
export default function LegalSection({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <h2>{title}</h2>
      <div className="measure mt-4 space-y-4 text-ink-soft [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_strong]:text-ink [&_strong]:font-medium">
        {children}
      </div>
    </section>
  )
}
