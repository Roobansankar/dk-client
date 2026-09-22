import clsx from 'clsx'

/**
 * Compact filter dropdown — the second filter on a page that has two (see
 * `SegmentedFilter` for the first). Reuses the public site's one `<select>`
 * styling convention verbatim (the `FIELD` recipe in Booking.jsx: rounded-sm,
 * hairline border, paper fill, ink focus ring), just sized for an inline
 * filter row instead of a stacked form field.
 *
 * Stacked label-above-control, exactly like `SegmentedFilter`, so when the
 * two sit side by side as a page's first and second filter their labels land
 * on the same line and the select's fixed `h-9` matches the segmented
 * track's height — "two balanced columns," not a label trailing its control.
 *
 * A native `<select>` rather than a second segmented pill so two filters on
 * the same row read as "primary choice, then refine by" rather than two
 * competing toggle groups — and it's free keyboard/screen-reader support.
 *
 * @param {object} props
 * @param {string} props.legend                  short label above the select
 * @param {{ value: string, label: string }[]} props.options
 * @param {string} props.value                   currently selected value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.className]
 */
export default function FilterSelect({ legend, options, value, onChange, className }) {
  return (
    <label className={clsx('flex flex-col items-start gap-2', className)}>
      <span className="eyebrow shrink-0">{legend}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-sm border border-line-strong bg-paper pl-3 pr-8 text-sm text-ink transition-colors focus-visible:border-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
