/// <reference types="vite/client" />
import {
  buildSSRBody,
  exposeInterceptors,
  getInitialPageFromDOM,
  http as httpModule,
  router,
  setupProgress,
  type InertiaAppSSRResponse,
  type Page,
  type PageProps,
  type ProgressOptions,
  type ServerHeadOption,
  type SharedPageProps,
} from '@inertiajs/core'
import { hydrate, render as renderRoot, renderToString } from '@solidjs/web'
import type { Element } from 'solid-js'
import App, { type InertiaApp, type InertiaAppProps } from './App'
import { config } from './config'
import type { SolidComponent, SolidInertiaAppConfig } from './types'

export type SetupOptions<ElementType, SharedProps extends PageProps> = {
  el: ElementType
  App: InertiaApp
  props: InertiaAppProps<SharedProps>
}

type ComponentResolver = (
  name: string,
  page?: Page<SharedPageProps>,
) => SolidComponent | Promise<SolidComponent> | { default: SolidComponent }

type RootWrapper<SharedProps extends PageProps> = (
  app: Element,
  options: { ssr: boolean; page: Page<SharedProps> },
) => Element

type Renderer = (root: () => Element) => string | Promise<string>

type SetupCallback<SharedProps extends PageProps> = (
  options: SetupOptions<HTMLElement | null, SharedProps>,
) => void | Element | (() => Element)

export type CreateSolidInertiaAppOptions<SharedProps extends PageProps> = {
  id?: string
  resolve: ComponentResolver
  setup?: SetupCallback<SharedProps>
  withApp?: RootWrapper<SharedProps>
  title?: InertiaAppProps<SharedProps>['titleCallback']
  serverHead?: ServerHeadOption
  progress?: ProgressOptions | false
  page?: Page<SharedProps>
  render?: Renderer
  defaults?: Partial<SolidInertiaAppConfig>
  nonce?: string
  http?: Parameters<typeof httpModule.setClient>[0]
  dev?: boolean
  layout?: InertiaAppProps<SharedProps>['defaultLayout']
}

type RenderFunction<SharedProps extends PageProps> = (
  page: Page<SharedProps>,
  renderer?: Renderer,
) => Promise<InertiaAppSSRResponse>

const unwrapComponent = (module: SolidComponent | { default: SolidComponent }): SolidComponent =>
  'default' in Object(module) ? (module as { default: SolidComponent }).default : (module as SolidComponent)

export default async function createInertiaApp<SharedProps extends PageProps = PageProps & SharedPageProps>(
  options: CreateSolidInertiaAppOptions<SharedProps>,
): Promise<void | InertiaAppSSRResponse | RenderFunction<SharedProps>> {
  const {
    id = 'app',
    resolve,
    setup,
    withApp,
    title,
    serverHead,
    progress = {},
    page,
    render,
    defaults = {},
    nonce,
    http,
    layout,
    dev = Boolean(import.meta.env?.DEV),
  } = options

  config.replace(defaults)
  if (nonce) config.set('nonce', nonce)
  if (http) httpModule.setClient(http)
  if (dev) exposeInterceptors()

  const isServer = typeof window === 'undefined'
  const resolveComponent = (name: string, currentPage?: Page) =>
    Promise.resolve(resolve(name, currentPage)).then(unwrapComponent)

  const renderPage = async (
    currentPage: Page<SharedProps>,
    renderer: Renderer = (root) => renderToString(root, { nonce }),
  ): Promise<InertiaAppSSRResponse> => {
    const initialComponent = await resolveComponent(currentPage.component, currentPage)
    let head: string[] = []
    const appProps: InertiaAppProps<SharedProps> = {
      initialPage: currentPage,
      initialComponent,
      resolveComponent,
      titleCallback: title,
      onHeadUpdate: (elements) => {
        head = elements
      },
      defaultLayout: layout,
      serverHead,
    }
    const root = () => {
      const app = setup ? setup({ el: null, App, props: appProps }) : <App {...appProps} />
      const resolved = typeof app === 'function' ? app() : app
      return withApp ? withApp(resolved as Element, { ssr: true, page: currentPage }) : (resolved as Element)
    }
    const html = await renderer(root)

    return { head, body: buildSSRBody(id, currentPage, html) }
  }

  if (isServer && !page && !render) {
    return renderPage
  }

  const initialPage = page ?? getInitialPageFromDOM<Page<SharedProps>>(id)!
  const [initialComponent] = await Promise.all([
    resolveComponent(initialPage.component, initialPage),
    router.decryptHistory().catch(() => undefined),
  ])
  let head: string[] = []
  const appProps: InertiaAppProps<SharedProps> = {
    initialPage,
    initialComponent,
    resolveComponent,
    titleCallback: title,
    onHeadUpdate: isServer ? (elements) => (head = elements) : undefined,
    defaultLayout: layout,
    serverHead,
  }

  if (isServer) {
    const renderer = render ?? ((root: () => Element) => renderToString(root, { nonce }))
    const root = () => {
      const app = setup ? setup({ el: null, App, props: appProps }) : <App {...appProps} />
      const resolved = typeof app === 'function' ? app() : app
      return withApp ? withApp(resolved as Element, { ssr: true, page: initialPage }) : (resolved as Element)
    }
    const html = await renderer(root)
    return { head, body: buildSSRBody(id, initialPage, html) }
  }

  const element = document.getElementById(id)
  if (!element) throw new Error(`Inertia root element #${id} was not found`)

  if (setup) {
    setup({ el: element, App, props: appProps })
  } else {
    const root = () => {
      const app = <App {...appProps} />
      return withApp ? withApp(app, { ssr: false, page: initialPage }) : app
    }

    if (element.hasAttribute('data-server-rendered')) {
      hydrate(root, element)
    } else {
      renderRoot(root, element)
    }
  }

  if (progress) setupProgress(progress)
}
