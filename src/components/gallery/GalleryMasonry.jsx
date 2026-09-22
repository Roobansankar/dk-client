import clsx from 'clsx'
import GalleryTile from './GalleryTile'

/**
 * SECTION 2 — the editorial masonry.
 *
 * A 12-column grid (6 at tablet, 2 on mobile). Every tile is a deliberately
 * unequal shape — wide heroes, tall portraits, small squares. Column spans AND
 * per-tile aspect ratios are chosen in consecutive pairs that each fill a full
 * row and resolve to the same height, so the composition stays asymmetric but
 * never ragged and reflows (rather than collapsing to a uniform grid) as the
 * viewport narrows. Rounded corners and a generous gap carry the editorial
 * whitespace. The 6-tile module repeats for longer sets; a lone trailing image
 * (odd count) becomes a full-width closing frame.
 */

// row groups per breakpoint — base 2col: [2 2][1 1][2 2] · sm 6col: [4 2][3 3][2 4]
// · lg 12col: [7 5][4 8][5 7]. Aspect ratios pair up to equal heights per row.
const TILES = [
  'col-span-2 aspect-[16/10] sm:col-span-4 sm:aspect-[2/1] lg:col-span-7 lg:aspect-[7/4]',
  'col-span-2 aspect-[4/3] sm:col-span-2 sm:aspect-square lg:col-span-5 lg:aspect-[5/4]',
  'col-span-1 aspect-square sm:col-span-3 sm:aspect-[3/2] lg:col-span-4 lg:aspect-[4/5]',
  'col-span-1 aspect-square sm:col-span-3 sm:aspect-[3/2] lg:col-span-8 lg:aspect-[8/5]',
  'col-span-2 aspect-[16/10] sm:col-span-2 sm:aspect-square lg:col-span-5 lg:aspect-[5/3]',
  'col-span-2 aspect-[4/3] sm:col-span-4 sm:aspect-[2/1] lg:col-span-7 lg:aspect-[7/3]',
]
const LONE_LAST =
  'col-span-2 aspect-[16/9] sm:col-span-6 sm:aspect-[21/8] lg:col-span-12 lg:aspect-[21/7]'

export default function GalleryMasonry({ items, onOpen, onImageError, className }) {
  if (items.length === 0) return null

  const lastIsLone = items.length % 2 === 1

  return (
    <div
      className={clsx(
        'grid grid-cols-2 gap-2.5 sm:grid-cols-6 sm:gap-3.5 lg:grid-cols-12 lg:gap-4',
        className,
      )}
    >
      {items.map((item, index) => {
        const lone = lastIsLone && index === items.length - 1
        return (
          <GalleryTile
            key={item.id}
            item={item}
            onOpen={onOpen}
            onImageError={onImageError}
            priority={index === 0}
            className={clsx('min-w-0', lone ? LONE_LAST : TILES[index % TILES.length])}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
          />
        )
      })}
    </div>
  )
}
