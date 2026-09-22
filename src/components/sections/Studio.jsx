import { CalendarCheck, Sparkles, Users } from 'lucide-react'
import Container from '../layout/Container'
import { studio } from '../../data/studio'

const FEATURE_ICONS = {
  personalised: Sparkles,
  professionals: Users,
  booking: CalendarCheck,
}

/**
 * Homepage "The Studio" section — a dark, full-width editorial band: a large
 * studio photograph on the left, eyebrow / serif headline / supporting copy and
 * three hairline-separated feature rows on the right. Faint decorative marks
 * (a corner bracket, a thin ring) are desktop-only and clipped by the section,
 * so they never cause horizontal overflow.
 *
 * Replaces the former "Experience" section. Content: src/data/studio.js.
 */
export default function Studio() {
  const { eyebrow, title, body, features, image } = studio

  return (
    <section
      id="studio"
      className="scroll-mt-24 overflow-hidden bg-scrim text-white"
    >
      <Container className="section-y">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-3 -top-3 hidden h-16 w-16 border-l border-t border-white/25 lg:block"
            />
            <img
              src={image.src}
              alt={image.alt}
              width={1600}
              height={1200}
              loading="lazy"
              className="relative aspect-[4/3] w-full object-cover lg:aspect-[5/4]"
            />
          </div>

          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-1 -top-12 hidden h-16 w-16 rounded-full border border-white/15 lg:block"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 right-6 hidden font-serif text-xl text-white/25 lg:block"
            >
              &#10022;
            </span>

            <p className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-accent">
              {eyebrow}
            </p>
            <p className="mt-4 font-serif text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] text-white">
              {title}
            </p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60">
              {body}
            </p>

            <ul className="mt-10 border-t border-white/15">
              {features.map(({ id, label }) => {
                const Icon = FEATURE_ICONS[id] ?? Sparkles
                return (
                  <li
                    key={id}
                    className="flex items-center gap-4 border-b border-white/15 py-4"
                  >
                    <Icon
                      size={18}
                      aria-hidden="true"
                      className="shrink-0 text-accent"
                    />
                    <span className="text-sm text-white/85">{label}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  )
}
