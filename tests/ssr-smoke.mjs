import { createComponent } from 'solid-js'
import { renderToString } from '@solidjs/web'
import { App, Head, usePage } from '../dist/ssr/index.js'

const Page = () => [createComponent(Head, { title: 'SSR title' }), usePage().props.greeting]
const page = {
  component: 'Home',
  url: '/',
  version: null,
  clearHistory: false,
  encryptHistory: false,
  rescuedProps: [],
  props: { greeting: 'Hello from Inertia Solid' },
}

let head = []
const html = renderToString(() =>
  createComponent(App, {
    initialPage: page,
    initialComponent: Page,
    resolveComponent: () => Page,
    onHeadUpdate: (elements) => {
      head = elements
    },
  }),
)

if (!html.includes('Hello from Inertia Solid')) {
  throw new Error(`SSR smoke test failed: ${html}`)
}

if (!head.some((element) => element.includes('<title data-inertia="">SSR title</title>'))) {
  throw new Error(`SSR head smoke test failed: ${JSON.stringify(head)}`)
}

console.log('SSR smoke test passed')
