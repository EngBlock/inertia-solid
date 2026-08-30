import { router, type VisitOptions } from '@inertiajs/core'
import { createSignal, onCleanup, type Accessor } from 'solid-js'

export type PrefetchState = {
  lastUpdatedAt: Accessor<number | null>
  isPrefetching: Accessor<boolean>
  isPrefetched: Accessor<boolean>
  flush: () => void
}

export default function usePrefetch(options: VisitOptions = {}): PrefetchState {
  const pathname = typeof window === 'undefined' ? '' : window.location.pathname
  const cached = typeof window === 'undefined' ? null : router.getCached(pathname, options)
  const inFlight = typeof window === 'undefined' ? null : router.getPrefetching(pathname, options)
  const [lastUpdatedAt, setLastUpdatedAt] = createSignal<number | null>(cached?.staleTimestamp ?? null)
  const [isPrefetching, setIsPrefetching] = createSignal(inFlight !== null)
  const [isPrefetched, setIsPrefetched] = createSignal(cached !== null)

  if (typeof window !== 'undefined') {
    const removePrefetching = router.on('prefetching', (event) => {
      if (event.detail.visit.url.pathname === window.location.pathname) {
        setIsPrefetching(true)
      }
    })
    const removePrefetched = router.on('prefetched', (event) => {
      if (event.detail.visit.url.pathname === window.location.pathname) {
        setIsPrefetching(false)
        setIsPrefetched(true)
        setLastUpdatedAt(event.detail.fetchedAt)
      }
    })

    onCleanup(() => {
      removePrefetching()
      removePrefetched()
    })
  }

  return {
    lastUpdatedAt,
    isPrefetching,
    isPrefetched,
    flush: () => router.flush(window.location.pathname, options),
  }
}
