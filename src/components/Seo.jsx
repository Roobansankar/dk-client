import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  SITE_NAME,
  absoluteUrl,
  metaDescription,
} from '../lib/seo'

/**
 * Per-page head metadata, using React 19's native hoisting of <title>,
 * <meta> and <link> into <head> (no extra dependency).
 *
 * - Indexable pages (default) get a canonical URL, robots "index", Open Graph
 *   and Twitter/X card tags.
 * - `noindex` pages (auth, account, cart, checkout, not-found) get robots
 *   "noindex, follow" and no canonical.
 * - `jsonLd` (one object or an array of nodes) is emitted as a single
 *   application/ld+json @graph block.
 *
 * index.html carries matching static defaults (marked `data-seo-default`) for
 * crawlers/link previews that don't run JavaScript; main.jsx removes them on
 * boot so each page's own tags are the only ones in the live document.
 */
export default function Seo({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  imageAlt = DEFAULT_OG_IMAGE_ALT,
  type = 'website',
  noindex = false,
  jsonLd,
}) {
  const desc = description ? metaDescription(description) : null
  const url = path != null ? absoluteUrl(path) : null
  const graph = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean) : []

  return (
    <>
      <title>{title}</title>
      {desc && <meta name="description" content={desc} />}
      <meta
        name="robots"
        content={noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}
      />

      {!noindex && url && <link rel="canonical" href={url} />}

      {!noindex && (
        <>
          <meta property="og:site_name" content={SITE_NAME} />
          <meta property="og:locale" content="en_IN" />
          <meta property="og:type" content={type} />
          <meta property="og:title" content={title} />
          {desc && <meta property="og:description" content={desc} />}
          {url && <meta property="og:url" content={url} />}
          {image && <meta property="og:image" content={image} />}
          {image && imageAlt && <meta property="og:image:alt" content={imageAlt} />}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          {desc && <meta name="twitter:description" content={desc} />}
          {image && <meta name="twitter:image" content={image} />}
          {image && imageAlt && <meta name="twitter:image:alt" content={imageAlt} />}
        </>
      )}

      {graph.length > 0 && (
        <script
          type="application/ld+json"
          // `<` is escaped so API-supplied text can never close the script tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(
              /</g,
              '\\u003c',
            ),
          }}
        />
      )}
    </>
  )
}
