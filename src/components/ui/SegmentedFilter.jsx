import clsx from 'clsx'

/**
 * Compact segmented pill filter — a rounded track of text segments with one
 * softly filled active segment; the rest stay transparent. Monochrome and
 * editorial, to the project's design language. This is the site's single
 * public filter control whenever a page has only one filter, and the FIRST
 * of two whenever a page has two (see `FilterSelect` for the second).
 *
 * Keyboard-native buttons with aria-pressed, grouped under an accessible label.
 * On narrow viewports the track spans the full width and the segments share it
 * evenly, so it never widens the page or needs a scrollbar; from `sm` up it
 * hugs its content, left-aligned with the rest of the page's editorial type.
 * The track is a fixed `h-9` so it lines up exactly with `FilterSelect`'s
 * dropdown when the two sit side by side as a page's first and second filter.
 *
 * @param {object} props
 * @param {string} [props.legend]                short label shown above the track
 * @param {{ value: string, label: string }[]} props.options
 * @param {string} props.value                   currently selected value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.className]
 */
export default function SegmentedFilter({
  legend,
  options,
  value,
  onChange,
  className,
}) {
  return (
    <div className={clsx('flex w-full flex-col items-start gap-2', className)}>
      {legend && <span className="eyebrow">{legend}</span>}
      <div
        role="group"
        aria-label={legend}
        className="flex h-9 w-full items-stretch gap-1 rounded-full border border-line bg-surface p-1 sm:inline-flex sm:w-auto"
      >
        {options.map((option) => {
          const active = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={clsx(
                'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-full px-2 text-center text-[0.65rem] font-medium uppercase tracking-[0.1em] transition-colors sm:flex-initial sm:px-3.5 sm:text-[0.7rem] sm:tracking-[0.12em]',
                active ? 'bg-surface-sunken text-ink' : 'text-muted hover:text-ink',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
