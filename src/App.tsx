import {
  createHeadManager,
  isPropsObject,
  isPropsObjectOrCallback,
  normalizeLayouts,
  resolveServerHead,
  router,
  type HeadManagerOnUpdateCallback,
  type HeadManagerTitleCallback,
  type LayoutDefinition,
  type Page,
  type PageHandler,
  type PageProps,
  type ServerHeadOption,
} from '@inertiajs/core'
import { isServer } from '@solidjs/web'
import {
  Show,
  createComponent,
  createSignal,
  flush,
  onCleanup,
  type Accessor,
  type Component,
  type Element,
  type Setter,
} from 'solid-js'
import { HeadContext, PageContext } from './contexts'
import {
  bindLayoutPropsRuntime,
  createLayoutPropsRuntime,
  type LayoutPropsRuntime,
  type LayoutPropsSnapshot,
} from './layoutProps'
import { createPageFacade, createPropsFacade } from './pageFacade'
import type { LayoutFunction, SolidComponent } from './types'

export interface InertiaAppProps<SharedProps extends PageProps = PageProps> {
  children?: (options: { Component: SolidComponent; props: PageProps; key: object }) => Element
  initialPage: Page<SharedProps>
  initialComponent?: SolidComponent
  resolveComponent?: (name: string, page?: Page) => SolidComponent | Promise<SolidComponent>
  titleCallback?: HeadManagerTitleCallback
  onHeadUpdate?: HeadManagerOnUpdateCallback
  defaultLayout?: (name: string, page: Page) => unknown
  serverHead?: ServerHeadOption
}

export type InertiaApp = Component<InertiaAppProps>

type LayoutEntry = {
  component: SolidComponent
  definition: Accessor<LayoutDefinition<SolidComponent>>
  setDefinition: Setter<LayoutDefinition<SolidComponent>>
}

type PageEntry = {
  component: SolidComponent
  key: object
}

const isComponent = (value: unknown): value is SolidComponent => typeof value === 'function'

const isLayoutResolver = (value: unknown): value is LayoutFunction => {
  if (typeof value !== 'function') return false

  const fn = value as Function
  return fn.length <= 1 && typeof fn.prototype === 'undefined' && !/^[A-Z]/.test(fn.name)
}

type ResolvedPageLayout = {
  definitions: LayoutDefinition<SolidComponent>[]
  render?: LayoutFunction
}

function resolvePageLayout(
  component: SolidComponent | undefined,
  page: Page,
  defaultLayout: InertiaAppProps['defaultLayout'],
): ResolvedPageLayout {
  if (!component) return { definitions: [] }

  const layout = component.layout
  let effectiveLayout: unknown
  let callbackProps: Record<string, unknown> | undefined

  if (isLayoutResolver(layout)) {
    const result = layout(page.props)
    const resolvedDefinitions = normalizeLayouts(result, isComponent)

    if (resolvedDefinitions.length > 0) {
      effectiveLayout = result
    } else if (typeof Node !== 'undefined' && result instanceof Node) {
      return { definitions: [], render: layout }
    } else if (defaultLayout && isPropsObjectOrCallback(result, isComponent)) {
      effectiveLayout = defaultLayout(page.component, page)
      callbackProps = result as Record<string, unknown>
    } else {
      return { definitions: [], render: layout }
    }
  } else if (isPropsObject(layout, isComponent)) {
    effectiveLayout = defaultLayout?.(page.component, page)
    callbackProps = layout as Record<string, unknown>
  } else {
    effectiveLayout = layout ?? defaultLayout?.(page.component, page)
  }

  const definitions = normalizeLayouts(effectiveLayout, isComponent)

  return {
    definitions: callbackProps
      ? definitions.map((definition) => ({
          ...definition,
          props: { ...definition.props, ...callbackProps },
        }))
      : definitions,
  }
}

function reconcileLayouts(current: LayoutEntry[], definitions: LayoutDefinition<SolidComponent>[]): LayoutEntry[] {
  const next: LayoutEntry[] = []

  for (let index = 0; index < definitions.length; index += 1) {
    const definition = definitions[index]!
    const existing = current[index]

    if (existing?.component === definition.component) {
      existing.setDefinition(definition)
      next.push(existing)
      continue
    }

    const [value, setValue] = createSignal(definition)
    next.push({ component: definition.component, definition: value, setDefinition: setValue })
  }

  return next
}

function createLayoutFacade(
  entry: LayoutEntry,
  pageProps: PageProps,
  dynamicProps: Accessor<LayoutPropsSnapshot>,
  child: () => Element,
): Record<string, unknown> {
  const values = () => {
    const definition = entry.definition()
    const dynamic = dynamicProps()

    return {
      ...pageProps,
      ...definition.props,
      ...dynamic.shared,
      ...(definition.name ? (dynamic.named[definition.name] ?? {}) : {}),
    }
  }

  return new Proxy<Record<string, unknown>>(
    {},
    {
      get(_target, property) {
        if (property === 'children') return child()
        return values()[property as string]
      },
      has(_target, property) {
        return property === 'children' || property in values()
      },
      ownKeys() {
        return [...new Set([...Reflect.ownKeys(values()), 'children'])]
      },
      getOwnPropertyDescriptor(_target, property) {
        if (property === 'children' || property in values()) {
          return { configurable: true, enumerable: true }
        }
      },
    },
  )
}

export default function App<SharedProps extends PageProps = PageProps>(props: InertiaAppProps<SharedProps>): Element {
  let pageSnapshot: Page = { ...props.initialPage, flash: props.initialPage.flash ?? {} }
  let activeComponent = props.initialComponent
  let pageEntryValue: PageEntry | undefined = activeComponent ? { component: activeComponent, key: {} } : undefined
  const initialLayout = resolvePageLayout(activeComponent, pageSnapshot, props.defaultLayout)
  let layoutEntriesValue = reconcileLayouts([], initialLayout.definitions)

  const [currentPage, setCurrentPage] = createSignal<Page>(pageSnapshot)
  const [pageEntry, setPageEntry] = createSignal<PageEntry | undefined>(pageEntryValue)
  const [layoutEntries, setLayoutEntries] = createSignal<LayoutEntry[]>(layoutEntriesValue)
  const [renderLayoutState, setRenderLayoutState] = createSignal<{ render?: LayoutFunction }>({
    render: initialLayout.render,
  })
  const [layoutProps, setLayoutProps] = createSignal<LayoutPropsSnapshot>({ shared: {}, named: {} })

  const dynamicLayoutProps: LayoutPropsRuntime = createLayoutPropsRuntime(setLayoutProps)
  const page = createPageFacade(currentPage)
  const pageProps = createPropsFacade(currentPage)
  const runtime = { page }

  const headManager = createHeadManager(
    isServer,
    (title) => (props.titleCallback ? props.titleCallback(title, currentPage()) : title),
    props.onHeadUpdate ?? (() => {}),
    resolveServerHead(props.initialPage, props.serverHead),
  )

  if (!isServer) {
    const unbindLayoutProps = bindLayoutPropsRuntime(dynamicLayoutProps)
    onCleanup(unbindLayoutProps)

    const swapComponent: PageHandler<SolidComponent> = async ({
      component: nextComponent,
      page: nextPage,
      preserveState,
      initialRender,
    }) => {
      if (initialRender) return

      if (!preserveState) dynamicLayoutProps.reset()

      const shouldRemountPage = !preserveState || activeComponent !== nextComponent
      activeComponent = nextComponent
      pageSnapshot = nextPage
      const resolvedLayout = resolvePageLayout(nextComponent, nextPage, props.defaultLayout)
      layoutEntriesValue = reconcileLayouts(layoutEntriesValue, resolvedLayout.definitions)

      setCurrentPage(nextPage)
      setLayoutEntries(layoutEntriesValue)
      setRenderLayoutState({ render: resolvedLayout.render })

      if (shouldRemountPage || !pageEntryValue) {
        pageEntryValue = { component: nextComponent, key: {} }
        setPageEntry(pageEntryValue)
      }

      flush()
    }

    router.init<SolidComponent>({
      initialPage: props.initialPage,
      resolveComponent: props.resolveComponent!,
      swapComponent,
      onFlash: (flash) => {
        pageSnapshot = { ...pageSnapshot, flash }
        setCurrentPage(pageSnapshot)
        flush()
      },
    })

    const syncServerHead = (event: { detail: { page: Page } }) => {
      headManager.updateServerHead(resolveServerHead(event.detail.page, props.serverHead))
    }

    const removeNavigateListener = router.on('navigate', syncServerHead)
    const removeClientVisitListener = router.on('clientVisit', syncServerHead)

    onCleanup(() => {
      removeNavigateListener()
      removeClientVisitListener()
    })
  }

  const PageOutlet: Component = () => (
    <Show when={pageEntry()} keyed>
      {(entry) => {
        const child = props.children
          ? props.children({ Component: entry.component, props: pageProps, key: entry.key })
          : createComponent(entry.component, pageProps)
        return renderLayoutState().render?.(child) ?? child
      }}
    </Show>
  )

  const LayoutOutlet: Component<{ depth: number }> = (outletProps) => {
    const entry = () => layoutEntries()[outletProps.depth]

    return (
      <Show when={entry()} keyed fallback={<PageOutlet />}>
        {(currentEntry) =>
          createComponent(
            currentEntry.component,
            createLayoutFacade(currentEntry, pageProps, layoutProps, () => (
              <LayoutOutlet depth={outletProps.depth + 1} />
            )),
          )
        }
      </Show>
    )
  }

  return (
    <HeadContext value={headManager}>
      <PageContext value={runtime}>
        <LayoutOutlet depth={0} />
      </PageContext>
    </HeadContext>
  )
}
