import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'

/**
 * Accessible custom listbox — used ONLY below the `sm` breakpoint (the
 * caller renders it with a `sm:hidden` wrapper class, alongside an actual
 * native `<select>` shown `hidden sm:block`).
 *
 * Why this exists: on some Android/Chrome mobile browsers, a native
 * `<select>`'s options popup can render detached from — or overflowing
 * past — the field it belongs to (a real, observed rendering bug, not a
 * CSS/z-index/overflow issue on this page). This component reproduces the
 * WAI-ARIA "Listbox" pattern entirely in-page so the option list always
 * stays within the form/viewport:
 * https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
 *
 * Desktop is untouched — it keeps using the real native `<select>`.
 *
 * Keyboard: Enter/Space/ArrowDown/ArrowUp opens it; once open, ArrowUp/Down
 * moves the active option (tracked via `aria-activedescendant` — focus
 * never leaves the trigger button), Home/End jump to the ends, Enter/Space
 * commits, Escape or Tab closes without changing the value.
 */
export default function MobileListbox({
  id,
  labelledBy,
  describedBy,
  value,
  onChange,
  options,
  placeholder = 'Select',
  disabled = false,
  invalid = false,
  className,
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const buttonRef = useRef(null)
  const rootRef = useRef(null)
  const optionIdBase = useId()

  const selectedIndex = options.findIndex((o) => String(o.value) === String(value))
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  // Close on an outside tap/click. `pointerdown` (not `click`) so it fires
  // before the browser would otherwise blur the button on touch.
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const openList = () => {
    if (disabled) return
    setOpen(true)
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }

  const commit = (index) => {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
    buttonRef.current?.focus()
  }

  const onKeyDown = (event) => {
    if (disabled) return

    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        break
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((i) => Math.min(options.length - 1, i + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((i) => Math.max(0, i - 1))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        commit(activeIndex)
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div ref={rootRef} className={clsx('relative', className)}>
      <button
        type="button"
        id={id}
        ref={buttonRef}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelledBy ? `${labelledBy} ${id}` : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${optionIdBase}-${activeIndex}` : undefined
        }
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={clsx(
          'mt-2 flex w-full items-center justify-between gap-2 rounded-sm border border-line-strong bg-paper px-3.5 py-2.5 text-left text-ink transition-colors focus-visible:border-ink disabled:cursor-not-allowed disabled:text-muted',
          invalid && 'border-ink!',
        )}
      >
        <span className={clsx('truncate', !selected && 'text-muted')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={clsx(
            'shrink-0 text-muted transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelledBy}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-sm border border-line-strong bg-surface py-1 shadow-lg"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${optionIdBase}-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => commit(index)}
              onPointerEnter={() => setActiveIndex(index)}
              className={clsx(
                'cursor-pointer px-3.5 py-2.5 text-sm text-ink transition-colors',
                index === activeIndex && 'bg-surface-sunken',
                index === selectedIndex && 'font-medium',
              )}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
