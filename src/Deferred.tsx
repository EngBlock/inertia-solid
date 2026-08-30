import { isSameUrlWithoutQueryOrHash, partialReloadRequestsSomeProps, router } from '@inertiajs/core'
import { get } from 'es-toolkit/compat'
import { createMemo, createSignal, onSettled, type Element } from 'solid-js'
import usePage from './usePage'

export interface DeferredSlotProps {
  reloading: () => boolean
}

export interface DeferredProps {
  data: string | string[]
  fallback: Element | (() => Element)
  rescue?: Element | ((props: DeferredSlotProps) => Element)
  children: Element | ((props: DeferredSlotProps) => Element)
}

export default function Deferred(props: DeferredProps): Element {
  const page = usePage()
  const [reloading, setReloading] = createSignal(false)
  const activeReloads = new Set<object>()
  const keys = createMemo(() => (Array.isArray(props.data) ? props.data : [props.data]))

  onSettled(() => {
    const removeStart = router.on('start', (event) => {
      const visit = event.detail.visit

      if (
        visit.preserveState === true &&
        isSameUrlWithoutQueryOrHash(visit.url, window.location) &&
        partialReloadRequestsSomeProps(visit, keys())
      ) {
        activeReloads.add(visit)
        setReloading(true)
      }
    })

    const removeFinish = router.on('finish', (event) => {
      const visit = event.detail.visit

      if (activeReloads.delete(visit)) {
        setReloading(activeReloads.size > 0)
      }
    })

    return () => {
      removeStart()
      removeFinish()
      activeReloads.clear()
    }
  })

  const slotProps = { reloading }
  const resolved = createMemo(() => {
    const hasAllProps = keys().every((key) => get(page.props, key) !== undefined)
    const rescued = new Set(page.rescuedProps ?? [])
    const hasRescuedProp = keys().some((key) => rescued.has(key))

    if (hasAllProps && !hasRescuedProp) {
      return typeof props.children === 'function' ? props.children(slotProps) : props.children
    }

    if (hasRescuedProp && props.rescue) {
      return typeof props.rescue === 'function' ? props.rescue(slotProps) : props.rescue
    }

    return typeof props.fallback === 'function' ? props.fallback() : props.fallback
  })

  return resolved as unknown as Element
}
