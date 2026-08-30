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
      response
        .writeHead(200, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
          Vary: 'X-Inertia',
          'X-Inertia': 'true',
        })
        .end(JSON.stringify(page))
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
