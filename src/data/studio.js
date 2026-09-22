/**
 * Homepage "The Studio" section (replaces the former "Experience" section).
 *
 * Image is DK StyleHub's own supplied studio photography
 * (src/assets/images/new-design/). Copy is restrained brand copy — it describes
 * the experience and the booking flow, and makes no unverified factual claims
 * (no awards, numbers, credentials).
 *
 * @typedef {Object} StudioContent
 * @property {string} eyebrow
 * @property {string} title
 * @property {string} body
 * @property {{ id: string, label: string }[]} features
 * @property {{ src: string, alt: string }} image
 */

import studioImage from '../assets/images/new-design/opt/studio.jpg'

/** @type {StudioContent} */
export const studio = {
  eyebrow: 'The studio',
  title: 'Designed for your beauty.',
  body: 'Step into a modern salon experience where every detail is designed to make you feel comfortable, confident and completely yourself.',
  features: [
    { id: 'personalised', label: 'Personalised beauty experience' },
    { id: 'professionals', label: 'Experienced professionals' },
    { id: 'booking', label: 'Easy online appointment booking' },
  ],
  image: {
    src: studioImage,
    alt: 'The DK StyleHub studio — mirrored styling stations, green chairs and a calm lounge',
  },
}
