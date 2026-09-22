import clsx from 'clsx'

/**
 * Restrained editorial filter row — a labelled inline group of text toggles,
 * not SaaS pills. Keyboard-native buttons with aria-pressed. Shared by the
 * /services and /products catalogues.
 *
 * @param {object} props
 * @param {string} props.legend                 short uppercase label
 * @param {{ value: string, label: string }[]} props.options
 * @param {string} props.value                  currently selected value
 * @param {(value: string) => void} props.onChange
 */
export default function FilterRow({ legend, options, value, onChange }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <span className="eyebrow shrink-0">{legend}</span>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {options.map((option, i) => (
          <span key={option.value} className="flex items-center">
            {i > 0 && (
              <span aria-hidden="true" className="px-1.5 text-line-strong">
                ·
              </span>
            )}
            <button
              type="button"
              aria-pressed={value === option.value}
              onClick={() => onChange(option.value)}
              className={clsx(
                'py-1 text-sm underline-offset-4 transition-colors',
                value === option.value
                  ? 'text-ink underline decoration-ink'
                  : 'text-muted no-underline hover:text-ink',
              )}
            >
              {option.label}
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
