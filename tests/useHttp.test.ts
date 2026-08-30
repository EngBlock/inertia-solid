import {
  HttpCancelledError,
  HttpResponseError,
  http,
  type HttpRequestConfig,
  type HttpResponse,
} from '@inertiajs/core'
import { createRoot, flush } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useHttp from '../src/useHttp'

type PendingRequest = {
  config: HttpRequestConfig
  resolve: (response: HttpResponse) => void
  reject: (error: unknown) => void
}

const response = (data: unknown, status = 200): HttpResponse => ({
  status,
  data: data === null ? '' : JSON.stringify(data),
  headers: { 'x-test': 'metadata' },
})

function captureRequests() {
  const requests: PendingRequest[] = []
  http.setClient({
    request: (config) =>
      new Promise((resolve, reject) => {
        requests.push({ config, resolve, reject })
      }),
  })
  return requests
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useHttp', () => {
  it('uses the configured client for typed verbs, generic submit, and Wayfinder calls', async () => {
    const requests = captureRequests()
    let form!: ReturnType<typeof useHttp<{ query: string }, { id: number }>>
    const dispose = createRoot((rootDispose) => {
      form = useHttp<{ query: string }, { id: number }>({ query: 'solid' })
      return rootDispose
    })

    const get = form.get('/search', { headers: { 'X-Custom': 'yes' } })
    expect(requests[0]!.config).toMatchObject({
      method: 'get',
      url: '/search?query=solid',
      headers: { Accept: 'application/json', 'X-Custom': 'yes' },
    })
    requests[0]!.resolve(response({ id: 1 }))
    await expect(get).resolves.toEqual({ id: 1 })

    for (const [method, submit] of [
      ['post', () => form.post('/items')],
      ['put', () => form.put('/items/1')],
      ['patch', () => form.patch('/items/1')],
      ['delete', () => form.delete('/items/1')],
      ['post', () => form.submit('post', '/explicit')],
      ['patch', () => form.submit({ method: 'patch', url: '/wayfinder' })],
    ] as const) {
      const promise = submit()
      const request = requests.at(-1)!
      expect(request.config.method).toBe(method)
      expect(request.config.data).toBe(JSON.stringify({ query: 'solid' }))
      requests.at(-1)!.resolve(response({ id: 2 }))
      await expect(promise).resolves.toEqual({ id: 2 })
    }

    expect(form.response).toEqual({ id: 2 })
    dispose()
  })

  it('submits configured URL-method pairs and converts file payloads to FormData', async () => {
    const requests = captureRequests()
    const file = new Blob(['solid'], { type: 'text/plain' })
    let form!: ReturnType<typeof useHttp<{ title: string; file: Blob }, { uploaded: boolean }>>
    const dispose = createRoot((rootDispose) => {
      form = useHttp<{ title: string; file: Blob }, { uploaded: boolean }>(
        { method: 'post', url: '/uploads' },
        { title: 'Avatar', file },
      )
      return rootDispose
    })

    const promise = form.submit()
    expect(requests[0]!.config).toMatchObject({ method: 'post', url: '/uploads' })
    expect(requests[0]!.config.data).toBeInstanceOf(FormData)
    const submitted = requests[0]!.config.data as FormData
    expect(submitted.get('title')).toBe('Avatar')
    expect(submitted.get('file')).toBeInstanceOf(Blob)
    expect(requests[0]!.config.headers).not.toHaveProperty('Content-Type')

    requests[0]!.resolve(response({ uploaded: true }))
    await expect(promise).resolves.toEqual({ uploaded: true })
    dispose()
  })

  it('projects progress and lifecycle state before callbacks and preserves response metadata', async () => {
    vi.useFakeTimers()
    const requests = captureRequests()
    const events: string[] = []
    let form!: ReturnType<typeof useHttp<{ name: string }, { saved: boolean }>>
    const dispose = createRoot((rootDispose) => {
      form = useHttp<{ name: string }, { saved: boolean }>({ name: 'Ada' })
      return rootDispose
    })

    const promise = form.post('/users', {
      onStart: () => events.push(`start:${form.processing}`),
      onProgress: () => events.push(`progress:${form.progress?.percentage}`),
      onSuccess: (_data, httpResponse) =>
        events.push(`success:${form.wasSuccessful}:${httpResponse.headers['x-test']}`),
      onFinish: () => events.push(`finish:${form.processing}`),
    })
    requests[0]!.config.onUploadProgress?.({ loaded: 5, total: 10, progress: 0.5, percentage: 50 })
    requests[0]!.resolve(response({ saved: true }))

    await expect(promise).resolves.toEqual({ saved: true })
    expect(events).toEqual([
      'start:true',
      'progress:50',
      'success:true:metadata',
      'finish:false',
    ])
    expect(form.progress).toBeNull()
    expect(form.recentlySuccessful).toBe(true)
    vi.advanceTimersByTime(2_000)
    expect(form.recentlySuccessful).toBe(false)
    dispose()
  })

  it('handles 422 errors but rejects HTTP exceptions and network failures after callbacks', async () => {
    const requests = captureRequests()
    const callbacks: string[] = []
    let form!: ReturnType<typeof useHttp<{ name: string }, { saved: boolean }>>
    const dispose = createRoot((rootDispose) => {
      form = useHttp<{ name: string }, { saved: boolean }>({ name: '' })
      return rootDispose
    })

    const invalid = form.post('/users', {
      onError: (errors) => callbacks.push(`validation:${errors.name}:${form.hasErrors}`),
    })
    requests[0]!.reject(
      new HttpResponseError('Unprocessable', response({ errors: { name: ['Required', 'Too short'] } }, 422)),
    )
    await expect(invalid).resolves.toBeUndefined()
    expect(form.errors.name).toBe('Required')

    const exception = form.post('/users', {
      onHttpException: (httpResponse) => callbacks.push(`http:${httpResponse.status}`),
    })
    const responseError = new HttpResponseError('Server error', response({ message: 'Failed' }, 500))
    requests[1]!.reject(responseError)
    await expect(exception).rejects.toBe(responseError)

    const networkError = new Error('offline')
    const network = form.post('/users', {
      onNetworkError: (error) => callbacks.push(`network:${error.message}`),
    })
    requests[2]!.reject(networkError)
    await expect(network).rejects.toBe(networkError)

    expect(callbacks).toEqual(['validation:Required:true', 'http:500', 'network:offline'])
    dispose()
  })

  it('rolls optimistic patches back on cancellation and prevents stale completion from winning', async () => {
    const requests = captureRequests()
    let form!: ReturnType<typeof useHttp<{ first: boolean; second: boolean }, { request: number }>>
    const dispose = createRoot((rootDispose) => {
      form = useHttp<{ first: boolean; second: boolean }, { request: number }>({ first: false, second: false })
      return rootDispose
    })

    const first = form.post('/first', { optimistic: () => ({ first: true }) })
    const second = form.post('/second', { optimistic: () => ({ second: true }) })
    flush()
    expect(form.data).toEqual({ first: true, second: true })

    requests[1]!.resolve(response({ request: 2 }))
    await expect(second).resolves.toEqual({ request: 2 })
    requests[0]!.reject(new HttpCancelledError('cancelled', '/first'))
    await expect(first).rejects.toBeInstanceOf(HttpCancelledError)

    expect(form.data).toEqual({ first: false, second: true })
    expect(form.response).toEqual({ request: 2 })
    expect(form.wasSuccessful).toBe(true)
    expect(form.processing).toBe(false)
    form.setData('second', false)
    form.reset()
    flush()
    expect(form.data).toEqual({ first: false, second: true })
    dispose()
  })

  it('aborts active requests on cancellation and owner disposal without late state updates', async () => {
    const requests = captureRequests()
    let form!: ReturnType<typeof useHttp<{ name: string }, { saved: boolean }>>
    const dispose = createRoot((rootDispose) => {
      form = useHttp<{ name: string }, { saved: boolean }>({ name: 'Ada' })
      return rootDispose
    })

    const cancelled = form.post('/cancel')
    const cancelledSignal = requests[0]!.config.signal!
    form.cancel()
    expect(cancelledSignal.aborted).toBe(true)
    requests[0]!.reject(new DOMException('Aborted', 'AbortError'))
    await expect(cancelled).rejects.toBeInstanceOf(HttpCancelledError)

    const late = form.post('/late')
    const lateSignal = requests[1]!.config.signal!
    dispose()
    expect(lateSignal.aborted).toBe(true)
    requests[1]!.resolve(response({ saved: true }))
    await expect(late).resolves.toEqual({ saved: true })
    expect(form.response).toBeNull()
    expect(form.wasSuccessful).toBe(false)
  })
})
