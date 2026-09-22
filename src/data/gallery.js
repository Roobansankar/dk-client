/**
 * DK StyleHub gallery items — STATIC FALLBACK.
 *
 * The live gallery comes from `GET /api/gallery` (see src/hooks/useGallery.js).
 * This set is only shown when that API is unavailable.
 *
 * Imagery is DK StyleHub's own supplied studio / service photography
 * (src/assets/images/new-design/). `alt` text describes a generic salon scene
 * only — no business claims or captions.
 *
 * @typedef {Object} GalleryItem
 * @property {string} id
 * @property {string} src
 * @property {string} alt
 */

import studioWide from '../assets/images/new-design/opt/studio-wide.jpg'
import studio from '../assets/images/new-design/opt/studio.jpg'
import lounge from '../assets/images/new-design/opt/lounge.jpg'
import stations from '../assets/images/new-design/opt/stations.jpg'
import serviceColour from '../assets/images/new-design/opt/service-hair-colour.jpg'
import serviceStyling from '../assets/images/new-design/opt/service-hair-styling.jpg'
import serviceFacial from '../assets/images/new-design/opt/service-skin-facial.jpg'
import serviceBridal from '../assets/images/new-design/opt/service-bridal.jpg'

/** @type {GalleryItem[]} */
export const galleryItems = [
  { id: 'g-studio-wide', src: studioWide, alt: 'The DK StyleHub studio floor with styling mirrors and marble flooring' },
  { id: 'g-colour', src: serviceColour, alt: 'A colourist applying foil highlights to a client' },
  { id: 'g-lounge', src: lounge, alt: 'The DK StyleHub lounge with leather seating and sculptural lighting' },
  { id: 'g-styling', src: serviceStyling, alt: 'A stylist finishing a client’s cut at the chair' },
  { id: 'g-facial', src: serviceFacial, alt: 'A facial treatment in a calm, candle-lit room' },
  { id: 'g-stations', src: stations, alt: 'A row of styling stations with round mirrors and daylight' },
  { id: 'g-bridal', src: serviceBridal, alt: 'Bridal makeup being applied at the studio' },
  { id: 'g-studio', src: studio, alt: 'The DK StyleHub styling area with green chairs and greenery' },
]
