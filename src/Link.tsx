import {
  isUrlMethodPair,
  mergeDataIntoQueryString,
  resolveUrlMethodPairComponent,
  router,
  shouldIntercept,
  shouldNavigate,
  type ActiveVisit,
  type LinkComponentBaseProps,
  type LinkPrefetchOption,
  type Method,
  type PendingVisit,
  type VisitOptions,
} from '@inertiajs/core'
import { Dynamic, type JSX, type ValidComponent } from '@solidjs/web'
import { createMemo, createSignal, omit, onSettled, type Element } from 'solid-js'
import { config } from './config'

interface BaseLinkProps extends LinkComponentBaseProps {
  as?: ValidComponent
  ref?: (element: HTMLElement) => void
  children?: Element
  onClick?: JSX.EventHandlerUnion<HTMLElement, MouseEvent>
}

export type InertiaLinkProps = BaseLinkProps & Omit<JSX.HTMLAttributes<HTMLElement>, keyof BaseLinkProps>

export default function Link(props: InertiaLinkProps): Element {
  const [inFlightCount, setInFlightCount] = createSignal(0)
  let hoverTimeout: ReturnType<typeof setTimeout> | undefined

  const method = createMemo<Method>(() =>
    isUrlMethodPair(props.href) ? props.href.method : ((props.method ?? 'get').toLowerCase() as Method),
  )
  const prefetchModes = createMemo<LinkPrefetchOption[]>(() => {
    if (props.prefetch === true) return ['hover']
    if (!props.prefetch) return []
    return Array.isArray(props.prefetch) ? props.prefetch : [props.prefetch]
  })
  const merged = createMemo(() =>
    mergeDataIntoQueryString(
      method(),
      isUrlMethodPair(props.href) ? props.href.url : String(props.href ?? ''),
      props.data ?? {},
      props.queryStringArrayFormat,
    ),
  )
  const href = () => merged()[0]
  const data = () => merged()[1]
  const resolvedComponent = () =>
    props.component ?? (props.instant && isUrlMethodPair(props.href) ? resolveUrlMethodPairComponent(props.href) : null)
  const component = createMemo<ValidComponent>(() => {
    const requested = props.as ?? 'a'
    return typeof requested === 'string' && requested.toLowerCase() === 'a' && method() !== 'get' ? 'button' : requested
  })

  const baseParams = (): VisitOptions => ({
    data: data(),
    method: method(),
    replace: props.replace,
    preserveScroll: props.preserveScroll,
    preserveState: props.preserveState ?? method() !== 'get',
    preserveUrl: props.preserveUrl,
    only: props.only,
    except: props.except,
    headers: props.headers,
    async: props.async,
    component: resolvedComponent(),
    pageProps: props.pageProps,
  })

  const visit = () => {
    router.visit(href(), {
      ...baseParams(),
      viewTransition: props.viewTransition,
      onCancelToken: props.onCancelToken,
      onBefore: props.onBefore,
      onStart: (value: PendingVisit) => {
        setInFlightCount((count) => count + 1)
        props.onStart?.(value)
      },
      onProgress: props.onProgress,
      onFinish: (value: ActiveVisit) => {
        setInFlightCount((count) => Math.max(0, count - 1))
        props.onFinish?.(value)
      },
      onCancel: props.onCancel,
      onSuccess: props.onSuccess,
      onError: props.onError,
    })
  }

  const prefetch = () => {
    const modes = prefetchModes()
    const cacheFor =
      props.cacheFor !== 0 && props.cacheFor !== undefined
        ? props.cacheFor
        : modes.length === 1 && modes[0] === 'click'
          ? 0
          : config.get('prefetch.cacheFor')

    router.prefetch(
      href(),
      {
        ...baseParams(),
        onPrefetching: props.onPrefetching,
        onPrefetched: props.onPrefetched,
      },
      { cacheFor, cacheTags: props.cacheTags },
    )
  }

  onSettled(() => {
    if (prefetchModes().includes('mount')) {
      queueMicrotask(prefetch)
    }

    return () => clearTimeout(hoverTimeout)
  })

  const callOnClick = (event: MouseEvent) => {
    if (typeof props.onClick === 'function') {
      ;(props.onClick as (event: MouseEvent) => void)(event)
    }
  }

  const onClick = (event: MouseEvent) => {
    callOnClick(event)

    if (shouldIntercept(event)) {
      event.preventDefault()
      visit()
    }
  }

  const eventProps = () => {
    if (prefetchModes().includes('hover')) {
      return {
        onMouseEnter: () => {
          hoverTimeout = setTimeout(prefetch, config.get('prefetch.hoverDelay'))
        },
        onMouseLeave: () => clearTimeout(hoverTimeout),
        onClick,
      }
    }

    if (prefetchModes().includes('click')) {
      return {
        onMouseDown: (event: MouseEvent) => {
          if (shouldIntercept(event)) {
            event.preventDefault()
            prefetch()
          }
        },
        onKeyDown: (event: KeyboardEvent) => {
          if (shouldNavigate(event)) {
            event.preventDefault()
            prefetch()
          }
        },
        onMouseUp: (event: MouseEvent) => {
          if (shouldIntercept(event)) {
            event.preventDefault()
            visit()
          }
        },
        onKeyUp: (event: KeyboardEvent) => {
          if (shouldNavigate(event)) {
            event.preventDefault()
            visit()
          }
        },
        onClick: (event: MouseEvent) => {
          callOnClick(event)
          if (shouldIntercept(event)) event.preventDefault()
        },
      }
    }

    return { onClick }
  }

  const htmlProps = omit(
    props,
    'as',
    'data',
    'href',
    'method',
    'replace',
    'preserveScroll',
    'preserveState',
    'preserveUrl',
    'only',
    'except',
    'headers',
    'queryStringArrayFormat',
    'async',
    'prefetch',
    'cacheFor',
    'cacheTags',
    'viewTransition',
    'component',
    'instant',
    'pageProps',
    'onClick',
    'onCancelToken',
    'onBefore',
    'onStart',
    'onProgress',
    'onFinish',
    'onCancel',
    'onSuccess',
    'onError',
    'onPrefetching',
    'onPrefetched',
    'children',
    'ref',
  )

  const elementProps = () => ({
    ...(component() === 'button' ? { type: 'button' } : {}),
    ...(component() === 'a' || typeof component() !== 'string' ? { href: href() } : {}),
    ref: props.ref,
    'data-loading': inFlightCount() > 0 ? '' : undefined,
    ...eventProps(),
  })

  return (
    <Dynamic component={component()} {...htmlProps} {...elementProps()}>
      {props.children}
    </Dynamic>
  )
}
