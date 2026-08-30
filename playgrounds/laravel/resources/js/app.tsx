import { createInertiaApp } from '@engblock/inertia-solid'
import type { SolidComponent } from '@engblock/inertia-solid'

const pages = import.meta.glob<{ default: SolidComponent }>('./Pages/**/*.tsx')

createInertiaApp({
  title: (title) => (title ? `${title} · Inertia Solid` : 'Inertia Solid'),
  resolve: (name) => {
    const page = pages[`./Pages/${name}.tsx`]

    if (!page) {
      throw new Error(`Unknown Inertia page: ${name}`)
    }

    return page().then((module) => module.default)
  },
})
