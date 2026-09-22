import { useCallback, useState } from 'react'
import { ApiError } from '../lib/api'
import { useToast } from '../lib/toast'

/**
 * Wraps a write call: tracks pending state, surfaces 422 field errors, and
 * toasts anything else. `fn` returns a promise; on success we clear errors and
 * call `onSuccess`.
 */
export function useMutation(fn, { onSuccess, successMessage } = {}) {
  const toast = useToast()
  const [pending, setPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const mutate = useCallback(
    async (...args) => {
      setPending(true)
      setFieldErrors({})
      try {
        const result = await fn(...args)
        if (successMessage) toast.success(successMessage)
        onSuccess?.(result)
        return { ok: true, result }
      } catch (err) {
        if (err instanceof ApiError && err.status === 422) {
          setFieldErrors(err.fieldErrors())
          toast.error(err.message || 'Please fix the highlighted fields.')
        } else if (err instanceof ApiError && err.status === 403) {
          toast.error("You don't have permission to do that.")
        } else if (err instanceof ApiError && err.status === 404) {
          // The record was deleted (here, another tab, or another admin). Never
          // show Laravel's raw "No query results for model…" text.
          toast.error('That record no longer exists — it may have been deleted.')
        } else if (err.name !== 'AbortError') {
          toast.error(err.message || 'Something went wrong.')
        }
        return { ok: false, error: err }
      } finally {
        setPending(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, onSuccess, successMessage],
  )

  return { mutate, pending, fieldErrors, setFieldErrors }
}
