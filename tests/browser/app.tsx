import { createInertiaApp, type SolidComponent } from '@engblock/inertia-solid'

const pages = import.meta.glob<{ default: SolidComponent }>('./fixtures/pages/**/*.tsx', { eager: true })

createInertiaApp({
  resolve: (name) => {
    const page = pages[`./fixtures/pages/${name}.tsx`]

    if (!page) {
      throw new Error(`Unknown browser-test fixture: ${name}`)
    }

    return page.default
  },
})
