import { createInertiaApp, type SolidComponent } from '@engblock/inertia-solid'
import type { Page } from '@inertiajs/core'

const pages = import.meta.glob<{ default: SolidComponent }>('./fixtures/pages/**/*.tsx', { eager: true })

export async function render(page: Page) {
  const params = new URL(page.url, 'http://localhost').searchParams

  return createInertiaApp({
    page,
    resolve: (name) => {
      const component = pages[`./fixtures/pages/${name}.tsx`]

      if (!component) {
        throw new Error(`Unknown browser-test SSR fixture: ${name}`)
      }

      return component.default
    },
    ...(params.has('withTitleCallback') && {
      title: (title, currentPage) => [title, currentPage.props.titleSuffix].filter(Boolean).join(' | '),
    }),
    ...(params.has('withServerHead') && { serverHead: true as const }),
    ...(params.has('withServerHeadCallback') && {
      serverHead: (currentPage) => currentPage.props.head as string[],
    }),
    ...(params.has('withServerHeadProp') && { serverHead: 'metaTags' }),
  })
}
