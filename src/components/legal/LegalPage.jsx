import Container from '../layout/Container'

/**
 * Shared shell for the legal documents (routes/Terms.jsx, routes/Privacy.jsx):
 * a centred reading column wider than the default `.measure`, a centred
 * header (eyebrow, title, intro, last-updated), the "On this page" contents
 * card, then the LegalSection blocks as children. Keeping the layout here
 * means the two pages can't drift apart visually.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {import('react').ReactNode} props.intro
 * @param {string} props.lastUpdated
 * @param {[string, string][]} props.contents - [anchor id, label] pairs
 * @param {import('react').ReactNode} props.children
 */
export default function LegalPage({ title, intro, lastUpdated, contents, children }) {
  return (
    <Container as="article" className="section-y">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-4 text-4xl sm:text-5xl">{title}</h1>
          <p className="mt-5 text-ink-soft">{intro}</p>
          <p className="mt-3 text-sm text-muted">Last updated: {lastUpdated}</p>
        </header>

        <nav aria-label="Table of contents" className="surface mt-10 p-5 sm:mt-12 sm:p-8">
          <p className="eyebrow">On this page</p>
          <ol className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {contents.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="text-sm text-ink-soft no-underline hover:text-ink">
                  {i + 1}. {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-12 space-y-10 sm:mt-16 sm:space-y-12">{children}</div>
      </div>
    </Container>
  )
}
