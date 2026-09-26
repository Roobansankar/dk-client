import clsx from 'clsx'
import Container from '../layout/Container'
import { useStylists } from '../../context/StylistsContext'
import { Skeleton } from '../StateViews'

/**
 * Homepage "Meet the Team": an editorial header and a portrait grid of every
 * visible stylist from `GET /api/stylists`, in the admin's order. The grid is
 * three columns on desktop (`lg`+), so extra stylists wrap onto new rows
 * (4 → 3 + 1, 7 → 3 + 3 + 1, …) instead of squeezing every card narrower;
 * two columns on `sm`, and a single stack below that. On `sm`+ every card
 * shares one fixed height; the image is absolutely positioned to always fill
 * that box exactly, whether the box's height comes from that fixed height or
 * the card's own aspect ratio (mobile stack, where the first card is a
 * taller portrait) — the same pattern used by ServicesPreview's tiles, so no
 * bare background ever shows through.
 *
 * Loading → portrait-shaped skeletons in the same grid (no photos/names
 * rendered yet). Failed/empty roster → the section shows a quiet
 * placeholder message rather than inventing team members; there is no static
 * "sample staff" fallback — a name and photo shown here always belongs to a
 * real stylist.
 */
export default function MeetTheTeam() {
  const { stylists, loading, error } = useStylists()

  const members = stylists.map((s) => ({
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
            className="mt-12 grid grid-cols-1 gap-3 sm:mt-16 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className={clsx(
                  'sm:h-[26rem] lg:h-[30rem]',
                  i === 0 ? 'aspect-[4/5] sm:aspect-auto' : 'aspect-[16/10] sm:aspect-auto',
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
          <ul className="mt-12 grid grid-cols-1 gap-3 sm:mt-16 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {members.map((member, i) => {
              return (
                <li
                  key={member.id}
                  className={clsx(
                    'group relative overflow-hidden cursor-pointer rounded-2xl border border-line bg-scrim sm:h-[26rem] lg:h-[30rem]',
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
