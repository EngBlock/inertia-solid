import { createInertiaApp, type SolidComponent } from '@engblock/inertia-solid'
import type { Page } from '@inertiajs/core'

const pages = import.meta.glob<{ default: SolidComponent }>('./fixtures/pages/**/*.tsx', { eager: true })

export async function render(page: Page) {
  return createInertiaApp({
    page,
    resolve: (name) => {
      const component = pages[`./fixtures/pages/${name}.tsx`]

      if (!component) {
        throw new Error(`Unknown browser-test SSR fixture: ${name}`)
      }

      return component.default
    },
  })
}
