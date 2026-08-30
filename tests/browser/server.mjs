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
  '/dump/get': { component: 'Dump', props: {} },
  '/dump/post': { component: 'Dump', props: {} },
  '/dump/put': { component: 'Dump', props: {} },
  '/dump/patch': { component: 'Dump', props: {} },
  '/dump/delete': { component: 'Dump', props: {} },
  '/form-helper/errors': { component: 'FormHelper/Errors', props: { errors: {} } },
  '/form-helper/methods': { component: 'FormHelper/Methods', props: {} },
  '/form-helper/optimistic': { component: 'FormHelper/Optimistic', props: { count: 1, errors: {} } },
  '/form-helper/remember': { component: 'FormHelper/Remember', props: {} },
  '/form-helper/set-data-then-post': { component: 'FormHelper/SetDataThenPost', props: {} },
  '/layout-props/basic': { component: 'LayoutProps/Basic', props: {} },
  '/layout-props/named-dynamic': { component: 'LayoutProps/NamedDynamic', props: { title: 'Page Title' } },
  '/layout-props/persistent-a': { component: 'LayoutProps/PersistentA', props: {} },
  '/layout-props/persistent-b': { component: 'LayoutProps/PersistentB', props: {} },
  '/layout-props/suffix-a': { component: 'LayoutProps/SuffixA', props: {} },
  '/layout-props/suffix-b': { component: 'LayoutProps/SuffixB', props: {} },
  '/layout-props/stateful-1': { component: 'LayoutProps/Stateful', props: { step: 1 } },
  '/layout-props/stateful-2': { component: 'LayoutProps/Stateful', props: { step: 2 } },
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function pageFor(pathname) {
  const route = routes[pathname]

  if (!route) return null

  return {
    component: route.component,
    props: route.props,
    url: pathname,
    version: null,
    clearHistory: false,
    encryptHistory: false,
    rescuedProps: [],
  }
}

async function readRequestData(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString('utf8')

  if (!body) return {}
  if (request.headers['content-type']?.includes('application/json')) return JSON.parse(body)

  return Object.fromEntries(new URLSearchParams(body))
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

    if (url.pathname.startsWith('/assets/') && (await serveAsset(url.pathname, response))) return

    const page = pageFor(url.pathname)
    if (!page) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found')
      return
    }

    if (request.headers['x-inertia']) {
      let inertiaPage = page

      if (url.pathname.startsWith('/dump/')) {
        const data = request.method === 'GET' ? Object.fromEntries(url.searchParams) : await readRequestData(request)
        inertiaPage = { ...page, props: { errors: {}, form: data, method: request.method.toLowerCase() } }
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
          props: data.fail
            ? { count: 1, errors: { fail: 'Optimistic update failed.' } }
            : { count: 2, errors: {} },
        }
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
      .end(await documentFor(page))
  } catch (error) {
    console.error(error)
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Internal server error')
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Solid browser fixture (${ssr ? 'SSR' : 'CSR'}) listening on http://127.0.0.1:${port}`)
})
