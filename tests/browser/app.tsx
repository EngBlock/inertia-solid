import { createInertiaApp, type SolidComponent } from '@engblock/inertia-solid'

const pages = import.meta.glob<{ default: SolidComponent }>('./fixtures/pages/**/*.tsx', { eager: true })
const params = new URLSearchParams(window.location.search)

createInertiaApp({
  resolve: (name) => {
    const page = pages[`./fixtures/pages/${name}.tsx`]

    if (!page) {
      throw new Error(`Unknown browser-test fixture: ${name}`)
    }

    return page.default
  },
  ...(params.has('withTitleCallback') && {
    title: (title, page) => [title, page.props.titleSuffix].filter(Boolean).join(' | '),
  }),
  ...(params.has('withServerHead') && { serverHead: true as const }),
  ...(params.has('withServerHeadCallback') && {
    serverHead: (page) => page.props.head as string[],
  }),
  ...(params.has('withServerHeadProp') && { serverHead: 'metaTags' }),
})
