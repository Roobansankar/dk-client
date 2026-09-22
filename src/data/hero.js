/**
 * Homepage hero — a single static, full-bleed editorial composition.
 *
 * Imagery is DK StyleHub's own supplied studio photography
 * (src/assets/images/new-design/, web-optimised copy under /opt). Copy is
 * restrained brand copy derived from PRODUCT.md and the studio's own site — no
 * factual claims (awards, experience, numbers).
 *
 * @typedef {Object} Hero
 * @property {string} eyebrow        small tracked label above the headline
 * @property {string} title          oversized wordmark headline
 * @property {string} bodyLead       supporting sentence, up to the emphasis
 * @property {string} bodyEmphasis   emphasised (italic) tail of the sentence
 * @property {{ src: string, alt: string }} image  full-bleed background photo
 */

import studioWide from '../assets/images/new-design/opt/studio-wide.jpg'

/** @type {Hero} */
export const hero = {
  eyebrow: 'Beauty · Style · Experience',
  title: 'The DK StyleHub',
  bodyLead: 'Beauty begins the moment you decide to be ',
  bodyEmphasis: 'yourself.',
  image: {
    src: studioWide,
    alt: 'The DK StyleHub studio floor — marble flooring, styling stations and warm daylight',
  },
}
