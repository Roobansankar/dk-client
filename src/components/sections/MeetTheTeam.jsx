import { useState } from 'react'
import clsx from 'clsx'
import Container from '../layout/Container'
import { useStylists } from '../../context/StylistsContext'
import { Skeleton } from '../StateViews'

/**
 * Homepage "Meet the Team": an editorial header and a portrait line-up, built
 * entirely from `GET /api/stylists` — one large, prominent card beside
 * several narrower, taller cards for the rest (see
 * design-references/meet-our-team-ref.png). Every card shares one row height
 * on `sm`+ (set on the `<ul>`, not the individual photos); the image is
 * absolutely positioned to always fill that box exactly, whether the box's
 * height comes from the row's fixed height (desktop) or the card's own aspect
 * ratio (mobile stack) — the same pattern used by ServicesPreview's tiles, so
 * a differently-sized card never leaves bare background showing through.
 *
 * Desktop (`sm`+, `flex-row`): which card is large is driven by hover, not a
 * fixed index. Width is a `flex-grow` CSS variable (`--card-grow`) rather
 * than a swapped Tailwind class, so the browser smoothly interpolates the
 * width change (`transition-[flex-grow]`) instead of jump-cutting between
 * two fixed layouts — no reflow flicker. Hovering off any card reverts to
 * the first stylist as large again. Below `sm` the row becomes a vertical
 * stack (`flex-col`) where `flex-grow` has no free space to distribute, so
 * the same markup is inert there: touch devices simply get the static
 * first-large/rest-narrow layout, with no hover state to get stuck in and no
 * horizontal growth to overflow.
 *
 * Loading → portrait-shaped skeletons in the same large/narrow rhythm (no
 * photos/names rendered yet). Failed/empty roster → the section shows a quiet
 * placeholder message rather than inventing team members; there is no static
 * "sample staff" fallback — a name and photo shown here always belongs to a
 * real stylist.
 */
export default function MeetTheTeam() {
  const { stylists, loading, error } = useStylists()
  const [hovered, setHovered] = useState(null)

  const members = stylists.slice(0, 4).map((s) => ({
    id: `stylist-${s.id}`,
    name: s.name,
    role: s.bio || '',
    image: s.image_url
      ? { src: s.image_url, alt: `${s.name} — DK StyleHub stylist` }
      : null,
  }))

  return (
    <section id="team" className="scroll-mt-20 border-t border-line bg-paper">
      <Container className="section-y">
        <header className="grid gap-x-8 gap-y-5 border-b border-line pb-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="eyebrow">Our team</p>
            <h2 className="mt-4 font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] text-ink">
              Meet our professionals.
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft lg:col-span-4 lg:pb-2">
            Skilled hands, thoughtful advice and professionals who care about
            every detail.
          </p>
        </header>

        {loading ? (
          <ul
            aria-hidden="true"
            className="mt-12 flex flex-col gap-3 sm:mt-16 sm:h-[26rem] sm:flex-row sm:gap-4 lg:h-[30rem]"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className={clsx(
                  i === 0
                    ? 'aspect-[4/5] sm:aspect-auto sm:flex-[1.6]'
                    : 'aspect-[16/10] sm:aspect-auto sm:flex-1',
                )}
              >
                <Skeleton className="h-full w-full rounded-2xl" />
              </li>
            ))}
          </ul>
        ) : members.length === 0 ? (
          <p className="mt-12 text-ink-soft sm:mt-16">
            {error
              ? 'We couldn’t load our team just now. Please check back shortly.'
              : 'Our team roster is being finalised — check back soon, or ask us in the studio.'}
          </p>
        ) : (
          <ul className="mt-12 flex flex-col gap-3 sm:mt-16 sm:h-[26rem] sm:flex-row sm:gap-4 lg:h-[30rem]">
            {members.map((member, i) => {
              const active = (hovered ?? 0) === i
              return (
                <li
                  key={member.id}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ '--card-grow': active ? 1.6 : 1 }}
                  className={clsx(
                    'group relative overflow-hidden cursor-pointer rounded-2xl border border-line bg-scrim sm:flex-[var(--card-grow)] sm:transition-[flex-grow] sm:duration-500 sm:ease-out',
                    i === 0
                      ? 'aspect-[4/5] sm:aspect-auto'
                      : 'aspect-[16/10] sm:aspect-auto',
                  )}
                >
                  {member.image ? (
                    <img
                      src={member.image.src}
                      alt={member.image.alt}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center bg-surface-sunken"
                    >
                      <span className="font-serif text-4xl text-muted">
                        {member.name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-scrim/85 via-scrim/15 to-transparent"
                  />

                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-serif text-lg text-white sm:text-xl lg:text-2xl [text-shadow:0_2px_16px_rgb(0_0_0/0.45)]">
                      {member.name}
                    </h3>
                    {member.role && (
                      <p className="mt-1 text-[0.62rem] font-medium uppercase tracking-[0.16em] text-white/75 [text-shadow:0_1px_8px_rgb(0_0_0/0.45)]">
                        {member.role}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Container>
    </section>
  )
}
