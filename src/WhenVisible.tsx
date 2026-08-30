import { router, type CancelToken, type ReloadOptions } from '@inertiajs/core'
import { Dynamic, type ValidComponent } from '@solidjs/web'
import { get } from 'es-toolkit/compat'
import { createEffect, createMemo, createSignal, onSettled, type Accessor, type Element } from 'solid-js'
import usePage from './usePage'

export interface WhenVisibleSlotProps {
  fetching: Accessor<boolean>
}

export interface WhenVisibleProps {
  children: Element | ((props: WhenVisibleSlotProps) => Element)
  fallback?: Element | (() => Element)
  data?: string | string[]
  params?: ReloadOptions
  buffer?: number
  as?: ValidComponent
  always?: boolean
}

export default function WhenVisible(props: WhenVisibleProps): Element {
  const page = usePage()
  const keys = createMemo(() => (props.data ? (Array.isArray(props.data) ? props.data : [props.data]) : []))
  const hasData = () => keys().length > 0 && keys().every((key) => get(page.props, key) !== undefined)
  const [loaded, setLoaded] = createSignal(hasData())
  const [fetching, setFetching] = createSignal(false)

  let element: HTMLElement | undefined
  let observer: IntersectionObserver | undefined
  let activeCancel: (() => void) | undefined
  let fetchingValue = false
  let settled = false
  let disposed = false

  const reloadParams = (): Partial<ReloadOptions> => {
    const options: Partial<ReloadOptions> = { preserveErrors: true, ...props.params }

    if (props.data) {
      options.only = (Array.isArray(props.data) ? props.data : [props.data]) as string[]
    }

    return options
  }

  const registerObserver = () => {
    observer?.disconnect()
    observer = undefined

    if (disposed || !element || (loaded() && !props.always)) return

    observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || fetchingValue || (!props.always && loaded())) return

        fetchingValue = true
        setFetching(true)

        const options = reloadParams()
        let cancelled = false

        router.reload({
          ...options,
          onCancelToken: (token: CancelToken) => {
            activeCancel = token.cancel
            options.onCancelToken?.(token)
          },
          onStart: (event) => {
            fetchingValue = true
            if (!disposed) setFetching(true)
            options.onStart?.(event)
          },
          onCancel: () => {
            cancelled = true
            options.onCancel?.()
          },
          onFinish: (event) => {
            activeCancel = undefined
            fetchingValue = false

            if (!disposed) {
              setFetching(false)

              if (!cancelled) {
                setLoaded(true)
                if (!props.always) observer?.disconnect()
              } else {
                queueMicrotask(registerObserver)
              }
            }

            options.onFinish?.(event)
          },
        })
      },
      { rootMargin: `${props.buffer ?? 0}px` },
    )
    observer.observe(element)
  }

  createEffect(
    () => keys().map((key) => get(page.props, key)),
    () => {
      setLoaded(hasData())
    },
    { defer: true },
  )

  createEffect(
    () => [props.always ?? false, props.buffer ?? 0, loaded()] as const,
    () => {
      if (settled) registerObserver()
    },
    { defer: true },
  )

  onSettled(() => {
    settled = true
    registerObserver()

    return () => {
      disposed = true
      observer?.disconnect()
      observer = undefined
      activeCancel?.()
      activeCancel = undefined
    }
  })

  const slotProps = { fetching }
  const content = createMemo(() => {
    if (!loaded()) {
      return typeof props.fallback === 'function' ? props.fallback() : props.fallback
    }

    return typeof props.children === 'function' ? props.children(slotProps) : props.children
  })

  return createMemo(() => {
    if (props.always || !loaded()) {
      return (
        <Dynamic component={props.as ?? 'div'} ref={(value: HTMLElement) => (element = value)}>
          {content()}
        </Dynamic>
      )
    }

    return content()
  }) as unknown as Element
}
