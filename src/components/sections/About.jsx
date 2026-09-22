import { Link } from 'react-router-dom'
import Container from '../layout/Container'
import { about } from '../../data/about'

/**
 * Homepage "About / Studio Story": balanced editorial split with a
 * correctly-sized portrait frame, supporting points, stats and CTAs.
 */
export default function About() {
  const { eyebrow, title, body, points = [], stats = [], image } = about

  return (
    <section id="about" className="scroll-mt-24 border-t border-line bg-paper">
      <Container className="section-y">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <figure className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-line bg-surface-sunken">
              <img
                src={image.src}
                width={image.width}
                height={image.height}
                alt={image.alt}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-[50%_20%]"
              />
            </div>
            <figcaption className="surface absolute -bottom-5 left-5 px-5 py-4 shadow-sm">
              <p className="font-serif text-2xl text-ink">5+ Years</p>
              <p className="eyebrow mt-1">of styling excellence</p>
            </figcaption>
          </figure>

          <div className="pt-4 lg:pt-0">
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-4">{title}</h2>
            <p className="measure mt-5 text-base leading-relaxed text-ink-soft">
              {body}
            </p>
            <p className="measure mt-4 text-base leading-relaxed text-ink-soft">
              From precision haircuts and colour to skin, bridal and grooming —
              every service is personalised to your look, with premium products
              and a hygienic, relaxing studio experience.
            </p>

            {points.length > 0 && (
              <ul className="mt-6 space-y-3">
                {points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                    />
                    <span className="text-base text-ink">{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {stats.length > 0 && (
              <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="order-2 mt-1 text-sm text-muted">
                      {stat.label}
                    </dt>
                    <dd className="order-1 font-serif text-3xl text-ink">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/services" className="btn">
                Explore Services
              </Link>
              <Link to="/contact#booking" className="btn btn-outline">
                Book Appointment
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
