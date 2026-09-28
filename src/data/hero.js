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
 * @property {{ src: string, tablet: string, mobile: string, alt: string }} image
 *   full-bleed background photo — desktop `src` plus tablet/mobile art-direction crops
 */

import heroDesktop from '../assets/images/hero-banner.png'
import heroTablet from '../assets/images/hero-tablet-view.png'
import heroMobile from '../assets/images/hero-mobile-view.png'

/** @type {Hero} */
export const hero = {
  eyebrow: 'Beauty · Style · Experience',
  title: 'DK StyleHub',
  bodyLead: 'Beauty begins the moment you decide to be ',
  bodyEmphasis: 'yourself.',
  image: {
    src: heroDesktop,
    tablet: heroTablet,
    mobile: heroMobile,
    alt: 'The DK StyleHub studio floor — marble flooring, styling stations and warm daylight',
  },
}
