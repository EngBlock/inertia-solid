import { createComponent } from 'solid-js'
import { renderToString } from '@solidjs/web'
import { App, Head, setLayoutProps, usePage } from '../dist/ssr/index.js'

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

const Layout = (props) => [`${props.title}:`, props.children]
const createIsolatedPage = (requestName, attemptedDynamicTitle) => {
  const RequestPage = () => {
    setLayoutProps({ title: attemptedDynamicTitle })
    return requestName
  }
  RequestPage.layout = [Layout, { title: requestName }]
  return RequestPage
}

const renderIsolatedRequest = async (requestName, attemptedDynamicTitle) => {
  const RequestPage = createIsolatedPage(requestName, attemptedDynamicTitle)
  await Promise.resolve()
  return renderToString(() =>
    createComponent(App, {
      initialPage: { ...page, component: requestName, props: {} },
      initialComponent: RequestPage,
      resolveComponent: () => RequestPage,
    }),
  )
}

const [requestA, requestB] = await Promise.all([
  renderIsolatedRequest('Request A', 'Leaked from A'),
  renderIsolatedRequest('Request B', 'Leaked from B'),
])

if (!requestA.startsWith('Request A:') || !requestA.endsWith('Request A') || requestA.includes('Leaked')) {
  throw new Error(`SSR layout props request A was not isolated: ${requestA}`)
}
if (!requestB.startsWith('Request B:') || !requestB.endsWith('Request B') || requestB.includes('Leaked')) {
  throw new Error(`SSR layout props request B was not isolated: ${requestB}`)
}

console.log('SSR smoke test passed')
