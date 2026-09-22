import { useState } from 'react'

/**
 * Keeps a local, mutable copy of server data (for optimistic reordering or
 * form edits) that re-syncs whenever the underlying server value changes.
 *
 * Uses the React-sanctioned "adjust state during render" pattern rather than an
 * effect, so there's no extra render cycle and no `set-state-in-effect` smell.
 *
 * @param {*} source        the server value (e.g. useQuery().data)
 * @param {Function} derive  maps source -> initial local copy (default: identity, [] when nullish)
 * @returns [local, setLocal]
 */
export function useEditableCopy(source, derive = (s) => s ?? []) {
  const [state, setState] = useState(() => ({ src: source, value: derive(source) }))

  if (state.src !== source) {
    setState({ src: source, value: derive(source) })
  }

  const setValue = (next) =>
    setState((s) => ({
      ...s,
      value: typeof next === 'function' ? next(s.value) : next,
    }))

  return [state.value, setValue]
}
