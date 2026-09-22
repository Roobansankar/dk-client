/**
 * Homepage "About / Studio Story" section.
 *
 * `body` is the studio's own supplied copy — used VERBATIM. Do not edit,
 * expand, rephrase, or add claims to it.
 *
 * `image` is the studio-provided asset, imported from src/assets/ so Vite
 * hashes and fingerprints it. To replace it later, drop a new file in
 * src/assets/images/about/ and change the import path below — the component
 * does not need to change.
 *
 * @typedef {Object} AboutContent
 * @property {string} eyebrow
 * @property {string} title
 * @property {string} body                Verbatim studio copy.
 * @property {{ src: string, width: number, height: number, alt: string }} image
 */
import aboutImage from '../assets/images/about/About-Section.jpeg'

/** @type {AboutContent} */
export const about = {
  eyebrow: 'About DK StyleHub',
  title: 'A Modern Unisex Salon for Everyone',
  body: "DK Stylehub Unisex Salon offers a contemporary and welcoming atmosphere for all. With skilled stylists, they provide a range of services from haircuts to beauty treatments. Their unisex approach caters to diverse clientele, ensuring everyone feels at home. The salon's focus on quality and customer satisfaction sets it apart.",
  points: [
    'Expert stylists for men & women',
    'Hair, skin, bridal & grooming services',
    'Premium products with strict hygiene',
  ],
  stats: [
    { value: '5+', label: 'Years Experience' },
    { value: '10k+', label: 'Happy Clients' },
    { value: '4.9', label: 'Google Rating' },
  ],
  image: {
    src: aboutImage,
    width: 853,
    height: 1280,
    alt: 'A DK StyleHub stylist holding gold shears toward the camera and a comb in the other hand, beside an illuminated salon mirror that catches their reflection',
  },
}
