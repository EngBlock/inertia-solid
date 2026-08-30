import {
  createHeadManager,
  resolveServerHead,
  router,
  type HeadManagerOnUpdateCallback,
  type HeadManagerTitleCallback,
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
  untrack,
  type Component,
  type Element,
} from 'solid-js'
import { HeadContext, PageContext } from './contexts'
import { createPageFacade, createPropsFacade } from './pageFacade'
import type { SolidComponent } from './types'

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

export default function App<SharedProps extends PageProps = PageProps>(props: InertiaAppProps<SharedProps>): Element {
  const [currentPage, setCurrentPage] = createSignal<Page>({
    ...props.initialPage,
    flash: props.initialPage.flash ?? {},
  })
  const [componentState, setComponentState] = createSignal<{ value?: SolidComponent }>({ value: props.initialComponent })
  const component = () => componentState().value
  const [remountKey, setRemountKey] = createSignal<object>({})

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
    const swapComponent: PageHandler<SolidComponent> = async ({
      component: nextComponent,
      page: nextPage,
      preserveState,
      initialRender,
    }) => {
      if (initialRender) {
        return
      }

      const shouldRemount = !preserveState || component() !== nextComponent

      setComponentState({ value: nextComponent })
      setCurrentPage(nextPage)

      if (shouldRemount) {
        setRemountKey({})
      }

      flush()
    }

    router.init<SolidComponent>({
      initialPage: props.initialPage,
      resolveComponent: props.resolveComponent!,
      swapComponent,
      onFlash: (flash) => {
        setCurrentPage((current) => ({ ...current, flash }))
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

  const PageInstance: Component = () => {
    const PageComponent = untrack(component)

    if (!PageComponent) {
      return null
    }

    const child = props.children
      ? props.children({ Component: PageComponent, props: pageProps, key: untrack(remountKey) })
      : createComponent(PageComponent, pageProps)
    const snapshot = untrack(currentPage)
    const layout = PageComponent.layout ?? props.defaultLayout?.(snapshot.component, snapshot)

    if (Array.isArray(layout)) {
      return layout.reduceRight<Element>(
        (outlet, Layout) => createComponent(Layout, { ...pageProps, children: outlet }),
        child,
      )
    }

    if (typeof layout === 'function') {
      // A one-argument function can be either an Inertia render layout or a component.
      // Component layouts should be supplied in an array until the persistent layout
      // owner implementation lands.
      return layout(child) as Element
    }

    return child
  }

  const PageOutlet: Component = () => (
    <Show when={remountKey()} keyed>
      {(_key) => <PageInstance />}
    </Show>
  )

  return (
    <HeadContext value={headManager}>
      <PageContext value={runtime}>
        <PageOutlet />
      </PageContext>
    </HeadContext>
  )
}
