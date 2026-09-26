import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowRight, Eye, Scissors } from 'lucide-react'
import Container from '../components/layout/Container'
import FooterCta from '../components/sections/FooterCta'
import Seo from '../components/Seo'
import { about } from '../data/about'
import { assetUrl } from '../lib/seo'
import studioBanner from '../assets/images/about-banner.webp'

const BOOKING = '/booking'

/**
 * Vision & Mission — paraphrased from the studio's own story copy
 * (see data/about.js, used verbatim in the story section below).
 */
const PILLARS = [
  {
    icon: Eye,
    title: 'Our Vision',
    body: 'To create a style of our own — to leave our signature on the art of styling, and to build a place where every person can discover a version of themselves they truly love.',
  },
  {
    icon: Scissors,
    title: 'Our Mission',
    body: 'To craft styles that feel personal, meaningful and true to who you are — because great styling is not just about appearance, it is about the trust behind the chair.',
  },
]

/**
 * Journey milestones — only dates and facts from the studio's own story:
 * in the industry since 2018, DK StyleHub opened in 2022, 300+ customers
 * strong through trust and referrals. Undated milestones carry no year.
 */
const TIMELINE = [
  {
    marker: '2018',
    title: 'The craft begins',
    body: 'Dhilip Kamaraj steps into the hair styling and salon industry — years of chairs, shears and learning the art from the ground up.',
  },
  {
    marker: '2022',
    title: 'DK StyleHub opens its doors',
    body: 'A small space with something far more valuable than size — skill, passion and hope. Every client gets a style that feels personal and true.',
  },
  {
    marker: '300+',
    title: 'A family of regulars',
    body: 'Along the way the studio grows to 300+ trusted customers — shaped by their trust, referrals and word of mouth, one returning face at a time.',
  },
  {
    marker: 'Today',
    title: 'A signature of our own',
    body: 'The dream is bigger than running a salon: creativity, precision and personality coming together into something uniquely yours.',
  },
]

function Story() {
  const { eyebrow, title, body = [], stats = [], image } = about

  return (
    <section className="border-t border-line bg-paper">
      <Container className="section-y">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:items-stretch lg:gap-12">
          <figure className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-line bg-surface-sunken lg:aspect-auto lg:h-full lg:min-h-[32rem]">
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
              <p className="font-serif text-2xl text-ink">8 Years</p>
              <p className="eyebrow mt-1">of Experience</p>
            </figcaption>
          </figure>

          <div className="pt-4 lg:pt-0">
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-4">{title}</h2>
            {body.map((paragraph, i) => (
              <p
                key={i}
                className={`measure ${i === 0 ? 'mt-5' : 'mt-4'} text-base leading-relaxed text-ink-soft`}
              >
                {/* `**text**` in the copy marks bold */}
                {paragraph.split('**').map((part, j) =>
                  j % 2 ? <strong key={j}>{part}</strong> : part,
                )}
              </p>
            ))}

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
              <Link to={BOOKING} className="btn btn-outline">
                Book Appointment
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

function Pillars() {
  return (
    <section className="border-t border-line bg-surface">
      <Container className="section-y">
        <p className="eyebrow text-center">What guides us</p>
        <h2 className="mx-auto mt-4 max-w-[22ch] text-center">
          Vision &amp; Mission
        </h2>

        <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
          {PILLARS.map((pillar) => (
            <article
              key={pillar.title}
              className="group relative overflow-hidden rounded-lg border border-line bg-paper p-7 transition-transform duration-200 hover:-translate-y-1 sm:p-8"
            >
              <span
                aria-hidden="true"
                className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent/12 text-accent"
              >
                <pillar.icon size={20} strokeWidth={1.75} />
              </span>
              <h3 className="relative mt-5 font-serif text-2xl text-ink">
                {pillar.title}
              </h3>
              <p className="relative mt-3 leading-relaxed text-ink-soft">
                {pillar.body}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

function Timeline() {
  return (
    <section className="border-t border-line bg-paper">
      <Container className="section-y">
        <p className="eyebrow text-center">Our journey</p>
        <h2 className="mx-auto mt-4 max-w-[22ch] text-center">
          From one chair to a signature
        </h2>

        <ol className="relative mx-auto mt-14 flex max-w-5xl flex-col">
          {/* The thread — left rail on mobile, centre spine on desktop. */}
          <span
            aria-hidden="true"
            className="absolute bottom-4 left-[1.3rem] top-4 w-px bg-gradient-to-b from-accent via-line-strong to-accent md:left-1/2 md:-translate-x-1/2"
          />

          {TIMELINE.map((step, i) => {
            const left = i % 2 === 0
            return (
              <li
                key={step.marker + step.title}
                className={clsx(
                  'relative pb-10 pl-16 last:pb-0 md:w-1/2 md:pl-0',
                  left
                    ? 'md:self-start md:pr-16'
                    : 'md:self-end md:pl-16',
                )}
              >
                {/* Marker pill — straddles the thread. */}
                <span
                  aria-hidden="true"
                  className={clsx(
                    'absolute top-0 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-surface py-1.5 pl-2.5 pr-4 shadow-sm',
                    'left-0 md:top-1',
                    left
                      ? 'md:left-full md:-translate-x-1/2'
                      : 'md:left-0 md:-translate-x-1/2',
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <span className="font-serif text-base text-ink">
                    {step.marker}
                  </span>
                </span>

                <article
                  className={clsx(
                    'group relative overflow-hidden rounded-lg border border-line bg-surface p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md sm:p-7',
                    !left && 'md:ml-auto',
                  )}
                >
                  <h3 className="relative font-serif text-xl text-ink">
                    {step.title}
                  </h3>
                  <p className="relative mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft">
                    {step.body}
                  </p>
                </article>
              </li>
            )
          })}
        </ol>

        <div className="mt-12 text-center">
          <Link
            to={BOOKING}
            className="btn rounded-full"
          >
            Become part of the story
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  )
}

/**
 * About route (/about) — the studio's story as its own page: a photographic
 * hero, the founder story with stats, Vision & Mission pillars, a journey
 * timeline, then the shared closing CTA before the global footer.
 */
export default function About() {
  return (
    <div className="about-page">
      <Seo
        title="About DK StyleHub — Our Story, Vision & Journey"
        description="DK StyleHub is a premium unisex salon in Coimbatore founded by Dhilip Kamaraj — 8 years of craft, 300+ happy clients. Read our story, vision and journey."
        path="/about"
        image={assetUrl(studioBanner)}
        imageAlt="The DK StyleHub studio — styling stations and chairs under warm light"
      />

      {/* Hero — the studio under a dark scrim, same recipe as Contact.jsx's
          banner (bg-scrim + cool-tinted wash + top-to-bottom gradient). */}
      <section className="relative overflow-hidden bg-scrim text-white">
        <img
          src={studioBanner}
          alt="The DK StyleHub studio — styling stations and chairs under warm light"
          loading="eager"
          fetchPriority="high"
          className="h-[46svh] min-h-[20rem] w-full object-cover object-[50%_60%] lg:h-[52svh]"
        />
        <span aria-hidden="true" className="absolute inset-0 bg-[#3f4a5f]/12" />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-scrim/50 via-scrim/15 to-scrim/70"
        />
        <Container className="absolute inset-0">
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-white/75 [text-shadow:0_1px_12px_rgb(0_0_0/0.5)]">
              About
            </p>
            <h1 className="mt-5 max-w-[16ch] font-serif leading-[1.03] text-white text-[clamp(2.25rem,6vw,4rem)] [text-shadow:0_2px_30px_rgb(0_0_0/0.45)]">
              Where craft meets trust.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75 [text-shadow:0_1px_10px_rgb(0_0_0/0.45)] sm:text-lg">
              The story of DK StyleHub — one stylist&apos;s journey from a
              single chair to a studio with a signature of its own.
            </p>
          </div>
        </Container>
      </section>

      <Story />
      <Pillars />
      <Timeline />
      <FooterCta />
    </div>
  )
}
