/**
 * Homepage "About / Studio Story" section.
 *
 * `body` is the studio's own supplied copy — used VERBATIM. Do not edit,
 * expand, rephrase, or add claims to it. One string per paragraph; `**text**`
 * marks bold.
 *
 * `image` is the studio-provided asset, imported from src/assets/ so Vite
 * hashes and fingerprints it. To replace it later, drop a new file in
 * src/assets/images/about/ and change the import path below — the component
 * does not need to change.
 *
 * @typedef {Object} AboutContent
 * @property {string} eyebrow
 * @property {string} title
 * @property {string[]} body              Verbatim studio copy, one entry per paragraph.
 * @property {{ src: string, width: number, height: number, alt: string }} image
 */
import aboutImage from '../assets/images/about/About-Section.jpeg'

/** @type {AboutContent} */
export const about = {
  eyebrow: 'About DK StyleHub',
  title: 'A Modern Unisex Salon for Everyone',
  body: [
    'I’m **Dhilip Kamaraj**, and I’ve been part of the hair styling and salon industry since 2018. In 2022, I took the next step and started my own salon, **DK StyleHub**.',
    'We began with a small space, but with something far more valuable than size — **skill, passion, and hope**. With every client, we focused on creating styles that felt personal, meaningful, and true to who they are.',
    'Today, DK StyleHub has grown to serve **300+ trusted customers**, and our journey has been shaped largely by their trust, referrals, and word of mouth. Every recommendation, every returning customer, and every new face introduced to us has been a reminder that great styling is not just about appearance — **it is about the trust behind the chair**.',
    'We entered this field because we see styling as an **art** — an art where creativity, precision, personality, and individuality come together. And our dream has always been bigger than simply running a salon: **to create a style of our own, leave our signature on this art, and build a place where every person can discover a version of themselves they truly love.**',
    '**DK StyleHub is not just where we style hair. It is where our craft, your trust, and our vision come together to create something uniquely yours.**',
  ],
  stats: [
    { value: '8', label: 'Years of Experience' },
    { value: '300+', label: 'Happy Clients' },
    { value: '4.9', label: 'Google Rating' },
  ],
  image: {
    src: aboutImage,
    width: 853,
    height: 1280,
    alt: 'A DK StyleHub stylist holding gold shears toward the camera and a comb in the other hand, beside an illuminated salon mirror that catches their reflection',
  },
}
