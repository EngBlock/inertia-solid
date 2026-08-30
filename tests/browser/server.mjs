import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateHydrationScript } from '@solidjs/web'

const root = fileURLToPath(new URL('.', import.meta.url))
const clientRoot = join(root, 'dist/client')
const port = Number(process.env.PORT ?? 13721)
const ssr = process.env.SSR === 'true'
const template = await readFile(join(clientRoot, 'index.html'), 'utf8')
const ssrRenderer = ssr ? await import('./dist/server/ssr.js') : null

const routes = {
  '/': { component: 'Home', props: { message: 'Rendered by the shared fixture server' } },
  '/about': { component: 'About', props: { message: 'Client-side navigation completed' } },
  '/head': { component: 'Head', props: {} },
  '/head/conditional': { component: 'Head/Conditional', props: {} },
  '/head/mixed': { component: 'Head/Mixed', props: {} },
  '/head/plain-title': { component: 'Head/Dataset', props: {} },
  '/head/reactive': { component: 'Head/Reactive', props: { titleSuffix: 'Dashboard' } },
  '/head/title-callback': { component: 'Head/TitleCallback', props: { titleSuffix: 'Account' } },
  '/head/with-title': { component: 'Head/WithTitle', props: {} },
  '/head/without-title': { component: 'Head/WithoutTitle', props: {} },
  '/server-head': { component: 'ServerHead', props: {} },
  '/server-head/custom-prop': { component: 'ServerHead', props: {} },
  '/server-head/keyed': { component: 'ServerHead', props: {} },
  '/server-head/keyed/next': { component: 'ServerHead', props: {} },
  '/dump/get': { component: 'Dump', props: {} },
  '/dump/post': { component: 'Dump', props: {} },
  '/dump/put': { component: 'Dump', props: {} },
  '/dump/patch': { component: 'Dump', props: {} },
  '/dump/delete': { component: 'Dump', props: {} },
  '/form-component/advanced': { component: 'FormComponent/Advanced', props: { form: {} } },
  '/form-component/basic': { component: 'FormComponent/Basic', props: { form: {} } },
  '/form-component/errors': { component: 'FormComponent/Errors', props: { errors: {} } },
  '/form-component/precognition/default': { component: 'FormComponent/Precognition/Default', props: {} },
  '/form-helper/errors': { component: 'FormHelper/Errors', props: { errors: {} } },
  '/form-helper/precognition/default': { component: 'FormHelper/Precognition/Default', props: {} },
  '/form-helper/methods': { component: 'FormHelper/Methods', props: {} },
  '/form-helper/optimistic': { component: 'FormHelper/Optimistic', props: { count: 1, errors: {} } },
  '/form-helper/remember': { component: 'FormHelper/Remember', props: {} },
  '/form-helper/set-data-then-post': { component: 'FormHelper/SetDataThenPost', props: {} },
  '/layout-props/basic': { component: 'LayoutProps/Basic', props: {} },
  '/layout-props/callback': { component: 'LayoutProps/Callback', props: { message: 'resolved' } },
  '/layout-props/render-function': { component: 'LayoutProps/RenderFunction', props: {} },
  '/layout-props/named-dynamic': { component: 'LayoutProps/NamedDynamic', props: { title: 'Page Title' } },
  '/layout-props/persistent-a': { component: 'LayoutProps/PersistentA', props: {} },
  '/layout-props/persistent-b': { component: 'LayoutProps/PersistentB', props: {} },
  '/layout-props/suffix-a': { component: 'LayoutProps/SuffixA', props: {} },
  '/layout-props/suffix-b': { component: 'LayoutProps/SuffixB', props: {} },
  '/layout-props/stateful-1': { component: 'LayoutProps/Stateful', props: { step: 1 } },
  '/layout-props/stateful-2': { component: 'LayoutProps/Stateful', props: { step: 2 } },
  '/infinite-scroll/automatic': { component: 'InfiniteScroll', props: { mode: 'automatic' } },
  '/infinite-scroll/custom': { component: 'InfiniteScroll', props: { mode: 'custom' } },
  '/infinite-scroll/manual': { component: 'InfiniteScroll', props: { mode: 'manual' } },
  '/infinite-scroll/manual-after': { component: 'InfiniteScroll', props: { mode: 'manual-after' } },
  '/infinite-scroll/manual-reverse': { component: 'InfiniteScroll', props: { mode: 'reverse-manual' } },
  '/infinite-scroll/preserve-url': { component: 'InfiniteScroll', props: { mode: 'preserve-url' } },
  '/infinite-scroll/remember-state': { component: 'InfiniteScroll', props: { mode: 'history' } },
  '/infinite-scroll/reverse': { component: 'InfiniteScroll', props: { mode: 'reverse' } },
  '/infinite-scroll/trigger-both': { component: 'InfiniteScroll', props: { mode: 'trigger-both' } },
  '/use-http': { component: 'UseHttp/Default', props: {} },
  '/when-visible': { component: 'WhenVisible', props: {} },
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function pageFor(url) {
  const route = routes[url.pathname]

  if (!route) return null

  let routeProps =
    route.props.mode === 'manual-after' && url.searchParams.get('reverse') === '1'
      ? { ...route.props, mode: 'reverse-manual-after' }
      : route.props

  if (url.pathname === '/server-head') {
    const override = url.searchParams.has('override')
    routeProps = {
      foo: `foo ${randomUUID()}`,
      next: '/server-head/keyed',
      head: override
        ? [
            '<title>Server Head Initial</title>',
            '<meta data-inertia="description" name="description" content="Server default">',
          ]
        : ['<title>Server Head Initial</title>', '<meta name="description" content="Initial server head description">'],
    }
  } else if (url.pathname === '/server-head/keyed') {
    routeProps = {
      next: '/server-head/keyed/next',
      head: [
        '<title data-inertia="title">Keyed Head A</title>',
        '<meta data-inertia="description" name="description" content="Keyed description A">',
        '<link data-inertia="canonical" rel="canonical" href="https://example.com/a">',
      ],
    }
  } else if (url.pathname === '/server-head/keyed/next') {
    routeProps = {
      next: '/server-head/keyed',
      head: [
        '<title data-inertia="title">Keyed Head B</title>',
        '<meta data-inertia="robots" name="robots" content="noindex">',
        '<meta data-inertia="description" name="description" content="Keyed description B">',
        '<link data-inertia="canonical" rel="canonical" href="https://example.com/b">',
      ],
    }
  } else if (url.pathname === '/server-head/custom-prop') {
    routeProps = {
      next: '/server-head',
      metaTags: ['<title>Custom Prop Head</title>', '<meta name="description" content="Custom prop description">'],
    }
  }
  const page = {
    component: route.component,
    props: routeProps,
    url: `${url.pathname}${url.search}`,
    version: null,
    clearHistory: false,
    encryptHistory: false,
    rescuedProps: [],
  }

  if (!url.pathname.startsWith('/infinite-scroll/')) return page

  const currentPage = Math.min(3, Math.max(1, Number(url.searchParams.get('page') ?? 1)))
  const firstUser = (currentPage - 1) * 5 + 1
  const reverse = routeProps.mode.startsWith('reverse')
  const users = Array.from({ length: 5 }, (_, index) => {
    const id = reverse ? 16 - firstUser - index : firstUser + index
    return { id, name: `User ${id}` }
  })

  return {
    ...page,
    props: { ...routeProps, users: { data: users } },
    mergeProps: ['users.data'],
    scrollProps: {
      users: {
        pageName: 'page',
        previousPage: currentPage > 1 ? currentPage - 1 : null,
        nextPage: currentPage < 3 ? currentPage + 1 : null,
        currentPage,
        reset: false,
      },
    },
  }
}

async function readRequestData(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)
  const contentType = request.headers['content-type'] ?? ''

  if (buffer.length === 0) return {}
  if (contentType.includes('application/json')) return JSON.parse(buffer.toString('utf8'))

  if (contentType.includes('multipart/form-data')) {
    const boundary = contentType
      .match(/boundary=(?:"([^"]+)"|([^;]+))/)
      ?.slice(1)
      .find(Boolean)
    if (!boundary) return {}

    const data = {}
    for (const part of buffer.toString('binary').split(`--${boundary}`).slice(1, -1)) {
      const [rawHeaders, rawValue = ''] = part.replace(/^\r\n|\r\n$/g, '').split('\r\n\r\n')
      const name = rawHeaders.match(/name="([^"]+)"/)?.[1]
      if (!name) continue
      const filename = rawHeaders.match(/filename="([^"]*)"/)?.[1]
      const value = filename === undefined ? rawValue.replace(/\r\n$/, '') : filename
      const current = data[name]
      data[name] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value]
    }
    return data
  }

  const data = {}
  for (const [key, value] of new URLSearchParams(buffer.toString('utf8'))) {
    const current = data[key]
    data[key] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value]
  }
  return data
}

function serializePage(page) {
  return JSON.stringify(page)
    .replaceAll('&', '\\u0026')
    .replaceAll('<', '\\u003C')
    .replaceAll('>', '\\u003E')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}

async function documentFor(page) {
  let head = ''
  let body

  if (ssr) {
    const rendered = await ssrRenderer.render(page)

    if (!rendered || !('body' in rendered)) {
      throw new Error('Solid SSR renderer returned no Inertia response')
    }

    head = [generateHydrationScript(), ...rendered.head].join('\n')
    body = rendered.body
  } else {
    body = `<script data-page="app" type="application/json">${serializePage(page)}</script><div id="app"></div>`
  }

  return template.replace('</head>', `${head}\n</head>`).replace('<div id="app"></div>', body)
}

async function serveAsset(pathname, response) {
  const relativePath = normalize(pathname).replace(/^[/\\]+/, '')
  const path = join(clientRoot, relativePath)

  if (!path.startsWith(clientRoot)) return false

  try {
    const contents = await readFile(path)
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': mimeTypes[extname(path)] ?? 'application/octet-stream',
    })
    response.end(contents)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host}`)

    if (url.pathname === '/health') {
      response.writeHead(200).end('ok')
      return
    }

    if (url.pathname === '/favicon.ico') {
      response.writeHead(204).end()
      return
    }

    if (url.pathname === '/custom.css') {
      response.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' }).end('')
      return
    }

    if (url.pathname.startsWith('/assets/') && (await serveAsset(url.pathname, response))) return

    if (url.pathname.startsWith('/api/use-http')) {
      const headers = {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Response-Metadata': 'preserved',
      }

      if (url.pathname === '/api/use-http/validation') {
        response.writeHead(422, headers).end(JSON.stringify({ errors: { name: ['The name field is required.'] } }))
        return
      }

      if (url.pathname === '/api/use-http/slow') {
        await new Promise((resolve) => setTimeout(resolve, 250))
      }

      const data = request.method === 'GET' ? Object.fromEntries(url.searchParams) : await readRequestData(request)
      response.writeHead(200, headers).end(JSON.stringify({ method: request.method, data }))
      return
    }

    if (url.pathname === '/precognition/default' && request.headers.precognition === 'true') {
      const data = await readRequestData(request)
      const fields = (request.headers['precognition-validate-only'] ?? '').split(',').filter(Boolean)
      const errors = {}

      if (fields.includes('name')) {
        if (!data.name) errors.name = ['The name field is required.']
        else if (String(data.name).length < 3) errors.name = ['The name must be at least 3 characters.']
      }
      if (fields.includes('email')) {
        if (!data.email) errors.email = ['The email field is required.']
        else if (!String(data.email).includes('@')) errors.email = ['The email must be a valid email address.']
      }

      if (data.name === 'ab') await new Promise((resolve) => setTimeout(resolve, 120))

      const headers = {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        Precognition: 'true',
      }
      if (Object.keys(errors).length) {
        response.writeHead(422, headers).end(JSON.stringify({ errors }))
      } else {
        response
          .writeHead(204, {
            'Cache-Control': 'no-store',
            Precognition: 'true',
            'Precognition-Success': 'true',
          })
          .end()
      }
      return
    }

    const page = pageFor(url)
    if (!page) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found')
      return
    }

    if (request.headers['x-inertia']) {
      let inertiaPage = { ...page, url: `${url.pathname}${url.search}` }

      if (url.pathname.startsWith('/dump/')) {
        const data = request.method === 'GET' ? Object.fromEntries(url.searchParams) : await readRequestData(request)
        await new Promise((resolve) => setTimeout(resolve, 120))
        inertiaPage = { ...inertiaPage, props: { errors: {}, form: data, method: request.method.toLowerCase() } }
      }

      if (request.method === 'POST' && url.pathname === '/form-component/advanced') {
        const data = await readRequestData(request)
        inertiaPage = { ...inertiaPage, props: { errors: {}, form: data } }
      }

      if (request.method === 'POST' && url.pathname === '/form-component/basic') {
        const data = await readRequestData(request)
        await new Promise((resolve) => setTimeout(resolve, 120))
        inertiaPage = { ...inertiaPage, props: { errors: {}, form: data } }
      }

      if (request.method === 'POST' && url.pathname === '/form-component/errors') {
        const data = await readRequestData(request)
        inertiaPage = {
          ...page,
          props: data.profile?.name ? { errors: {} } : { errors: { 'profile.name': 'The name field is required.' } },
        }
      }

      if (request.method === 'POST' && url.pathname === '/form-helper/errors') {
        const data = await readRequestData(request)
        inertiaPage = {
          ...page,
          props: data.profile?.name ? { errors: {} } : { errors: { 'profile.name': 'The name field is required.' } },
        }
      }

      if (request.method === 'POST' && url.pathname === '/form-helper/optimistic') {
        const data = await readRequestData(request)
        await new Promise((resolve) => setTimeout(resolve, 150))
        inertiaPage = {
          ...page,
          props: data.fail ? { count: 1, errors: { fail: 'Optimistic update failed.' } } : { count: 2, errors: {} },
        }
      }

      if (url.pathname.startsWith('/infinite-scroll/')) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        const mergeIntent = request.headers['x-inertia-infinite-scroll-merge-intent']
        if (mergeIntent === 'prepend') {
          inertiaPage = {
            ...inertiaPage,
            mergeProps: undefined,
            prependProps: ['users.data'],
          }
        }
      }

      if (url.pathname === '/server-head' && request.headers['x-inertia-partial-data']) {
        inertiaPage = { ...inertiaPage, props: { foo: `foo ${randomUUID()}` } }
      }

      if (url.pathname === '/when-visible') {
        await new Promise((resolve) => setTimeout(resolve, 250))
        const only = String(request.headers['x-inertia-partial-data'] ?? '')
          .split(',')
          .filter(Boolean)
        const props = {}

        if (only.includes('foo')) props.foo = 'loaded'
        if (only.includes('delayed')) props.delayed = 'loaded'
        if (only.length === 0) props.count = Number(url.searchParams.get('count') ?? 0)

        inertiaPage = { ...inertiaPage, props }
      }

      response
        .writeHead(200, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
          Vary: 'X-Inertia',
          'X-Inertia': 'true',
        })
        .end(JSON.stringify(inertiaPage))
      return
    }

    response
      .writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
        Vary: 'X-Inertia',
      })
      .end(await documentFor({ ...page, url: `${url.pathname}${url.search}` }))
  } catch (error) {
    if (error?.code === 'ECONNRESET' || error?.message === 'aborted') return

    console.error(error)
    if (!response.headersSent) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Internal server error')
    } else {
      response.destroy(error)
    }
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Solid browser fixture (${ssr ? 'SSR' : 'CSR'}) listening on http://127.0.0.1:${port}`)
})
