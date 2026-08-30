import {
  getScrollableParent,
  useInfiniteScroll,
  type InfiniteScrollActionSlotProps as CoreInfiniteScrollActionSlotProps,
  type InfiniteScrollComponentBaseProps,
  type InfiniteScrollRef,
  type InfiniteScrollSlotProps as CoreInfiniteScrollSlotProps,
  type ReloadOptions,
  type UseInfiniteScrollProps,
} from '@inertiajs/core'
import { Dynamic, type JSX, type ValidComponent } from '@solidjs/web'
import { createEffect, createMemo, createSignal, omit, onSettled, type Element } from 'solid-js'
import usePage from './usePage'

export interface InfiniteScrollSlotProps extends CoreInfiniteScrollSlotProps {}

export interface InfiniteScrollActionSlotProps extends CoreInfiniteScrollActionSlotProps {}

export type InfiniteScrollElement = string | (() => HTMLElement | null | undefined)

interface InfiniteScrollComponentProps extends Omit<InfiniteScrollComponentBaseProps, 'as'> {
  as?: ValidComponent
  children?: Element | ((props: InfiniteScrollSlotProps) => Element)
  startElement?: InfiniteScrollElement
  endElement?: InfiniteScrollElement
  itemsElement?: InfiniteScrollElement
  previous?: Element | ((props: InfiniteScrollActionSlotProps) => Element)
  next?: Element | ((props: InfiniteScrollActionSlotProps) => Element)
  loading?: Element | ((props: InfiniteScrollActionSlotProps) => Element)
  params?: ReloadOptions
  ref?: (value: InfiniteScrollRef) => void
}

export type InfiniteScrollProps = InfiniteScrollComponentProps &
  Omit<JSX.HTMLAttributes<HTMLElement>, keyof InfiniteScrollComponentProps | 'children' | 'ref'>

const resolveElement = (
  value: InfiniteScrollElement | undefined,
  fallback?: HTMLElement,
): HTMLElement | undefined => {
  if (typeof value === 'string') return document.querySelector<HTMLElement>(value) ?? undefined
  if (typeof value === 'function') return value() ?? undefined
  return fallback
}

export default function InfiniteScroll(props: InfiniteScrollProps): Element {
  const page = usePage()
  const scrollProp = () => page.scrollProps?.[props.data]
  const [loadingPrevious, setLoadingPrevious] = createSignal(false)
  const [loadingNext, setLoadingNext] = createSignal(false)
  const [requestCount, setRequestCount] = createSignal(0)
  const [hasPreviousPage, setHasPreviousPage] = createSignal(!!scrollProp()?.previousPage)
  const [hasNextPage, setHasNextPage] = createSignal(!!scrollProp()?.nextPage)

  let defaultStartElement: HTMLDivElement | undefined
  let defaultEndElement: HTMLDivElement | undefined
  let defaultItemsElement: HTMLElement | undefined
  let infiniteScroll: UseInfiniteScrollProps | undefined

  const manualMode = createMemo(
    () => !!props.manual || ((props.manualAfter ?? 0) > 0 && requestCount() >= props.manualAfter!),
  )
  const autoLoad = createMemo(() => !manualMode())
  const fetchPrevious = (options?: ReloadOptions) =>
    infiniteScroll?.dataManager.fetchPrevious(options)
  const fetchNext = (options?: ReloadOptions) => infiniteScroll?.dataManager.fetchNext(options)
  const hasPrevious = () => infiniteScroll?.dataManager.hasPrevious() ?? hasPreviousPage()
  const hasNext = () => infiniteScroll?.dataManager.hasNext() ?? hasNextPage()

  const syncState = () => {
    if (!infiniteScroll) return
    setRequestCount(infiniteScroll.dataManager.getRequestCount())
    setHasPreviousPage(infiniteScroll.dataManager.hasPrevious())
    setHasNextPage(infiniteScroll.dataManager.hasNext())
  }

  const exposed: InfiniteScrollRef = { fetchNext, fetchPrevious, hasPrevious, hasNext }

  createEffect(
    () => [autoLoad(), props.onlyNext, props.onlyPrevious] as const,
    ([enabled]) => {
      if (!infiniteScroll) return
      if (enabled) infiniteScroll.elementManager.enableTriggers()
      else infiniteScroll.elementManager.disableTriggers()
    },
    { defer: true },
  )

  onSettled(() => {
    const itemsElement = resolveElement(props.itemsElement, defaultItemsElement)
    const startElement = resolveElement(props.startElement, defaultStartElement)
    const endElement = resolveElement(props.endElement, defaultEndElement)

    if (!itemsElement || !startElement || !endElement) {
      throw new Error('InfiniteScroll could not resolve its items, start, and end elements.')
    }

    const scrollableParent = getScrollableParent(itemsElement)
    infiniteScroll = useInfiniteScroll({
      getPropName: () => props.data,
      inReverseMode: () => !!props.reverse,
      shouldFetchNext: () => !props.onlyPrevious,
      shouldFetchPrevious: () => !props.onlyNext,
      shouldPreserveUrl: () => !!props.preserveUrl,
      getReloadOptions: () => props.params ?? {},
      getTriggerMargin: () => props.buffer ?? 0,
      getStartElement: () => startElement,
      getEndElement: () => endElement,
      getItemsElement: () => itemsElement,
      getScrollableParent: () => scrollableParent,
      onBeforePreviousRequest: () => setLoadingPrevious(true),
      onBeforeNextRequest: () => setLoadingNext(true),
      onCompletePreviousRequest: ({ completed }) => {
        setLoadingPrevious(false)
        if (completed) syncState()
      },
      onCompleteNextRequest: ({ completed }) => {
        setLoadingNext(false)
        if (completed) syncState()
      },
      onDataReset: syncState,
    })

    syncState()
    infiniteScroll.elementManager.setupObservers()
    infiniteScroll.elementManager.processServerLoadedElements(
      infiniteScroll.dataManager.getLastLoadedPage(),
    )

    if (props.autoScroll ?? !!props.reverse) {
      if (scrollableParent) {
        scrollableParent.scrollTo({ top: scrollableParent.scrollHeight, behavior: 'instant' })
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
      }
    }

    if (autoLoad()) infiniteScroll.elementManager.enableTriggers()
    props.ref?.(exposed)

    return () => {
      infiniteScroll?.flush()
      infiniteScroll = undefined
      setLoadingPrevious(false)
      setLoadingNext(false)
    }
  })

  const previousState: InfiniteScrollActionSlotProps = {
    get loading() {
      return loadingPrevious()
    },
    fetch: () => fetchPrevious(),
    get autoMode() {
      return autoLoad() && !props.onlyNext
    },
    get manualMode() {
      return !this.autoMode
    },
    get hasMore() {
      return hasPreviousPage()
    },
    get loadingPrevious() {
      return loadingPrevious()
    },
    get loadingNext() {
      return loadingNext()
    },
    get hasPrevious() {
      return hasPreviousPage()
    },
    get hasNext() {
      return hasNextPage()
    },
  }

  const nextState: InfiniteScrollActionSlotProps = {
    get loading() {
      return loadingNext()
    },
    fetch: () => fetchNext(),
    get autoMode() {
      return autoLoad() && !props.onlyPrevious
    },
    get manualMode() {
      return !this.autoMode
    },
    get hasMore() {
      return hasNextPage()
    },
    get loadingPrevious() {
      return loadingPrevious()
    },
    get loadingNext() {
      return loadingNext()
    },
    get hasPrevious() {
      return hasPreviousPage()
    },
    get hasNext() {
      return hasNextPage()
    },
  }

  const itemState: InfiniteScrollSlotProps = {
    get loading() {
      return loadingPrevious() || loadingNext()
    },
    get loadingPrevious() {
      return loadingPrevious()
    },
    get loadingNext() {
      return loadingNext()
    },
  }

  const renderAction = (
    content: Element | ((props: InfiniteScrollActionSlotProps) => Element) | undefined,
    state: InfiniteScrollActionSlotProps,
  ) => (typeof content === 'function' ? content(state) : content)

  const previousContent = createMemo(() =>
    props.previous
      ? renderAction(props.previous, previousState)
      : loadingPrevious()
        ? renderAction(props.loading, previousState)
        : undefined,
  )
  const nextContent = createMemo(() =>
    props.next
      ? renderAction(props.next, nextState)
      : loadingNext()
        ? renderAction(props.loading, nextState)
        : undefined,
  )
  const items = createMemo(() =>
    typeof props.children === 'function' ? props.children(itemState) : props.children,
  )

  const htmlProps = omit(
    props,
    'data',
    'buffer',
    'as',
    'manual',
    'manualAfter',
    'preserveUrl',
    'reverse',
    'autoScroll',
    'onlyNext',
    'onlyPrevious',
    'startElement',
    'endElement',
    'itemsElement',
    'previous',
    'next',
    'loading',
    'params',
    'ref',
    'children',
  )

  const start = !props.startElement && (
    <div ref={(element) => (defaultStartElement = element)}>{previousContent()}</div>
  )
  const itemContainer = (
    <Dynamic
      component={props.as ?? 'div'}
      {...htmlProps}
      ref={(element: HTMLElement) => (defaultItemsElement = element)}
    >
      {items()}
    </Dynamic>
  )
  const end = !props.endElement && (
    <div ref={(element) => (defaultEndElement = element)}>{nextContent()}</div>
  )
  const elements = createMemo(() =>
    props.reverse ? [end, itemContainer, start] : [start, itemContainer, end],
  )

  return <>{elements()}</>
}

export type { InfiniteScrollRef }
