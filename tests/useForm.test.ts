import type { CancelToken, Page, Progress, VisitOptions } from '@inertiajs/core'
import { router } from '@inertiajs/core'
import { client, HttpResponseError, type HttpRequestConfig, type HttpResponse } from 'laravel-precognition'
import { createRoot, flush } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { config } from '../src/config'
import useForm, { type InertiaPrecognitiveForm } from '../src/useForm'

const progress: Progress = {
  percentage: 50,
  bytes: 5,
  total: 10,
}

function capturePost() {
  let data: unknown
  let options: VisitOptions = {}
  const spy = vi.spyOn(router, 'post').mockImplementation((_url, submitted, visitOptions) => {
    data = submitted
    options = visitOptions ?? {}
  })

  return { spy, data: () => data, options: () => options }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  config.set('form.recentlySuccessfulDuration', 2_000)
})

describe('useForm', () => {
  it('updates nested data, defaults, resets, errors, and dirtiness', () => {
    createRoot((dispose) => {
      const form = useForm({ profile: { name: 'Ada' }, active: true })

      form.setData('profile.name', 'Grace')
      flush()
      expect(form.data.profile.name).toBe('Grace')
      expect(form.isDirty).toBe(true)

      form.setDefaults('profile.name', 'Grace')
      expect(form.isDirty).toBe(false)

      form.setData('active', false)
      form.setError('profile.name', 'Choose another name')
      form.setError({ active: 'Must be active' })
      flush()
      expect(form.errors).toEqual({
        'profile.name': 'Choose another name',
        active: 'Must be active',
      })
      expect(form.hasErrors).toBe(true)

      form.reset('active')
      form.clearErrors('active')
      flush()
      expect(form.data.active).toBe(true)
      expect(form.errors).toEqual({ 'profile.name': 'Choose another name' })

      form.resetAndClearErrors()
      flush()
      expect(form.data).toEqual({ profile: { name: 'Grace' }, active: true })
      expect(form.errors).toEqual({})
      expect(form.isDirty).toBe(false)
      dispose()
    })
  })

  it('re-resolves function defaults on reset and rejects explicit defaults', () => {
    let generation = 0

    createRoot((dispose) => {
      const form = useForm(() => ({ token: `value-${++generation}`, nested: { count: generation } }))
      form.setData('token', 'changed')
      form.reset()
      flush()

      expect(form.data).toEqual({ token: 'value-2', nested: { count: 2 } })
      expect(form.isDirty).toBe(false)
      expect(() => form.setDefaults()).toThrow(
        'You cannot call `setDefaults()` when using a function to define your form data.',
      )
      dispose()
    })
  })

  it('posts transformed latest canonical data and updates state before callbacks', async () => {
    const request = capturePost()

    createRoot((dispose) => {
      const form = useForm({ name: 'Ada', meta: { role: 'author' } })
      const observed: string[] = []

      form.transform((data) => ({ ...data, name: data.name.toUpperCase() }))
      form.setData('name', 'Grace')
      form.post('/users', {
        onStart: () => observed.push(`start:${form.processing}`),
        onProgress: () => observed.push(`progress:${form.progress?.percentage}`),
        onSuccess: () => observed.push(`success:${form.wasSuccessful}:${form.hasErrors}`),
        onFinish: () => observed.push(`finish:${form.processing}:${form.progress}`),
      })

      expect(request.data()).toEqual({ name: 'GRACE', meta: { role: 'author' } })

      const options = request.options()
      options.onStart?.({} as never)
      options.onProgress?.(progress)
      options.onSuccess?.({} as Page)
      options.onFinish?.({} as never)

      expect(observed).toEqual(['start:true', 'progress:50', 'success:true:false', 'finish:false:null'])
      dispose()
    })
  })

  it('supports every submit shape and forwards visit options', () => {
    const calls: Array<{ method: string; url: string; data: unknown; options: VisitOptions }> = []

    for (const method of ['get', 'post', 'put', 'patch'] as const) {
      vi.spyOn(router, method).mockImplementation((url, data, options) => {
        calls.push({ method, url: String(url), data, options: options ?? {} })
      })
    }
    vi.spyOn(router, 'delete').mockImplementation((url, options) => {
      calls.push({ method: 'delete', url: String(url), data: options?.data, options: options ?? {} })
    })

    createRoot((dispose) => {
      const form = useForm({ name: 'Ada' })
      const shared = {
        errorBag: 'profile',
        invalidateCacheTags: ['users'],
        preserveScroll: true,
        preserveState: 'errors' as const,
        preserveUrl: true,
        reset: ['users'],
        viewTransition: true,
      }

      form.get('/users', shared)
      form.post('/users', shared)
      form.put('/users/1', shared)
      form.patch('/users/1', shared)
      form.delete('/users/1', shared)
      form.submit('post', '/explicit', shared)
      form.submit({ method: 'patch', url: '/wayfinder' }, shared)

      expect(calls.map(({ method, url }) => [method, url])).toEqual([
        ['get', '/users'],
        ['post', '/users'],
        ['put', '/users/1'],
        ['patch', '/users/1'],
        ['delete', '/users/1'],
        ['post', '/explicit'],
        ['patch', '/wayfinder'],
      ])
      expect(calls.every(({ data }) => JSON.stringify(data) === JSON.stringify({ name: 'Ada' }))).toBe(true)
      expect(calls[0]?.options).toMatchObject(shared)
      dispose()
    })
  })

  it('cancels the latest submission and prevents stale requests from winning lifecycle state', async () => {
    const requests: VisitOptions[] = []
    vi.spyOn(router, 'post').mockImplementation((_url, _data, options) => requests.push(options ?? {}))
    const firstCancel = vi.fn()
    const secondCancel = vi.fn()
    const callbacks: string[] = []

    createRoot((dispose) => {
      const form = useForm({ name: 'Ada' })

      form.post('/first', { onSuccess: () => callbacks.push('first') })
      requests[0]?.onCancelToken?.({ cancel: firstCancel } as CancelToken)
      requests[0]?.onStart?.({} as never)

      form.post('/second', { onSuccess: () => callbacks.push('second') })
      requests[1]?.onCancelToken?.({ cancel: secondCancel } as CancelToken)
      requests[1]?.onStart?.({} as never)
      form.cancel()

      expect(firstCancel).not.toHaveBeenCalled()
      expect(secondCancel).toHaveBeenCalledOnce()

      requests[0]?.onError?.({ name: 'Stale error' })
      requests[0]?.onSuccess?.({} as Page)
      requests[0]?.onFinish?.({} as never)
      expect(form.processing).toBe(true)
      expect(form.errors).toEqual({})
      expect(form.wasSuccessful).toBe(false)

      requests[1]?.onSuccess?.({} as Page)
      requests[1]?.onFinish?.({} as never)
      expect(form.processing).toBe(false)
      expect(form.wasSuccessful).toBe(true)
      expect(callbacks).toEqual(['first', 'second'])
      dispose()
    })
  })

  it('remembers data and errors while omitting dontRemember fields', () => {
    vi.spyOn(router, 'restore').mockImplementation((key) => {
      if (key === 'profile:data') return { name: 'Grace', password: '' }
      if (key === 'profile:errors') return { name: 'Restored error' }
      return undefined
    })
    const remember = vi.spyOn(router, 'remember').mockImplementation(() => {})

    createRoot((dispose) => {
      const form = useForm('profile', { name: 'Ada', password: 'secret' }).dontRemember('password')
      flush()

      expect(form.data).toEqual({ name: 'Grace', password: '' })
      expect(form.errors).toEqual({ name: 'Restored error' })

      form.setData({ name: 'Katherine', password: 'classified' })
      form.setError('password', 'Required')
      flush()

      expect(remember).toHaveBeenCalledWith({ name: 'Katherine' }, 'profile:data')
      expect(remember).toHaveBeenCalledWith({ name: 'Restored error', password: 'Required' }, 'profile:errors')
      dispose()
    })
  })

  it('delegates a fluent optimistic update once and lets inline optimism override it', () => {
    const request = capturePost()
    const fluent = vi.fn()
    const inline = vi.fn()

    createRoot((dispose) => {
      const form = useForm({ name: 'Ada' })
      expect(form.optimistic(fluent)).toBe(form)

      form.post('/first')
      expect(request.options().optimistic).toBe(fluent)

      form.optimistic(fluent).post('/second', { optimistic: inline })
      expect(request.options().optimistic).toBe(inline)

      form.post('/third')
      expect(request.options().optimistic).toBeUndefined()
      dispose()
    })
  })

  it('validates against a reactive Precognition endpoint and exposes reactive state', async () => {
    let method: 'post' | 'patch' = 'post'
    let url = '/users'
    let request!: HttpRequestConfig
    let resolveResponse!: (response: HttpResponse) => void
    client.useHttpClient({
      request: (config) => {
        request = config
        return new Promise((resolve) => (resolveResponse = resolve))
      },
    })

    let form!: ReturnType<typeof useForm<{ name: string }>>
    const dispose = createRoot((rootDispose) => {
      form = useForm(
        () => method,
        () => url,
        { name: 'Ada' },
      )
      method = 'patch'
      url = '/profiles/1'
      form.setData('name', 'Grace')
      form.setValidationTimeout(0).validate('name', { headers: { 'X-Test': 'precognition' } })
      return rootDispose
    })

    expect(form.touched('name')).toBe(true)
    expect(form.validating).toBe(true)
    expect(request).toMatchObject({
      method: 'patch',
      url: '/profiles/1',
      headers: expect.objectContaining({
        Precognition: true,
        'Precognition-Validate-Only': 'name',
        'X-Test': 'precognition',
      }),
    })

    resolveResponse({
      status: 204,
      data: null,
      headers: { precognition: 'true', 'precognition-success': 'true' },
    })

    await vi.waitFor(() => expect(form.validating).toBe(false))
    expect(form.valid('name')).toBe(true)
    expect(form.invalid('name')).toBe(false)
    dispose()
  })

  it('updates validation errors before invoking each lifecycle callback once', async () => {
    client.useHttpClient({
      request: async () => {
        throw new HttpResponseError({
          status: 422,
          data: { errors: { name: ['Too short', 'Letters only'] } },
          headers: { precognition: 'true' },
        })
      },
    })
    const callbacks: string[] = []

    let form!: InertiaPrecognitiveForm<{ name: string }>
    const dispose = createRoot((rootDispose) => {
      form = useForm('post', '/users', { name: '' }).setValidationTimeout(0).withAllErrors()
      form.setData('name', 'ab')
      form.validate('name', {
        onValidationError: () => callbacks.push(`error:${form.invalid('name')}:${form.validating}`),
        onFinish: () => callbacks.push(`finish:${form.validating}`),
      })
      return rootDispose
    })

    await vi.waitFor(() => expect(form.validating).toBe(false))
    expect(form.errors.name).toEqual(['Too short', 'Letters only'])
    expect(callbacks).toEqual(['error:true:true', 'finish:false'])
    dispose()
  })

  it('ignores stale validation results even when the transport resolves after cancellation', async () => {
    const requests: Array<{
      config: HttpRequestConfig
      resolve(response: HttpResponse): void
      reject(error: unknown): void
    }> = []
    client.useHttpClient({
      request: (config) =>
        new Promise((resolve, reject) => {
          requests.push({ config, resolve, reject })
        }),
    })

    let form!: InertiaPrecognitiveForm<{ name: string }>
    const dispose = createRoot((rootDispose) => {
      const validationForm = useForm('post', '/users', { name: '' }).setValidationTimeout(0)
      form = validationForm
      validationForm.setData('name', 'ab')
      validationForm.validate('name')
      validationForm.setData('name', 'Grace')
      validationForm.validate('name')
      return rootDispose
    })

    await vi.waitFor(() => expect(requests).toHaveLength(2))
    requests[1]!.resolve({
      status: 204,
      data: null,
      headers: { precognition: 'true', 'precognition-success': 'true' },
    })
    await vi.waitFor(() => expect(form.valid('name')).toBe(true))

    const staleResponse = {
      status: 422,
      data: { errors: { name: ['Stale error'] } },
      headers: { precognition: 'true' },
    }
    requests[0]!.reject(new HttpResponseError(staleResponse))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(form.errors).toEqual({})
    expect(form.valid('name')).toBe(true)
    dispose()
  })

  it('cancels validation before submission and ignores completion after owner disposal', async () => {
    let validationRequest!: HttpRequestConfig
    let resolveValidation!: (response: HttpResponse) => void
    client.useHttpClient({
      request: (config) => {
        validationRequest = config
        return new Promise((resolve) => (resolveValidation = resolve))
      },
    })
    const submission = capturePost()

    let form!: InertiaPrecognitiveForm<{ name: string }>
    const dispose = createRoot((rootDispose) => {
      form = useForm('post', '/users', { name: '' }).setValidationTimeout(0)
      form.setData('name', 'Grace')
      form.validate('name')
      return rootDispose
    })

    form.submit()
    expect(validationRequest.signal?.aborted).toBe(true)
    expect(submission.spy).toHaveBeenCalledOnce()
    expect(form.validating).toBe(false)

    dispose()
    resolveValidation({
      status: 204,
      data: null,
      headers: { precognition: 'true', 'precognition-success': 'true' },
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(form.valid('name')).toBe(false)
  })

  it('cleans up recently-successful timers and uses the configured duration', () => {
    vi.useFakeTimers()
    const request = capturePost()
    config.set('form.recentlySuccessfulDuration', 25)

    let form!: ReturnType<typeof useForm<{ name: string }>>
    const dispose = createRoot((rootDispose) => {
      form = useForm({ name: 'Ada' })
      form.post('/users')
      request.options().onSuccess?.({} as Page)
      expect(form.recentlySuccessful).toBe(true)
      return rootDispose
    })

    vi.advanceTimersByTime(24)
    expect(form.recentlySuccessful).toBe(true)
    dispose()
    vi.advanceTimersByTime(1)
    expect(form.recentlySuccessful).toBe(true)
  })

  it('ignores late lifecycle state updates after its owner is disposed', () => {
    const request = capturePost()
    let processingAtDispose = false
    let form!: ReturnType<typeof useForm<{ name: string }>>

    const dispose = createRoot((rootDispose) => {
      form = useForm({ name: 'Ada' })
      form.post('/users')
      request.options().onStart?.({} as never)
      processingAtDispose = form.processing
      return rootDispose
    })

    expect(processingAtDispose).toBe(true)
    dispose()
    request.options().onError?.({ name: 'Too late' })
    request.options().onSuccess?.({} as Page)
    request.options().onFinish?.({} as never)

    expect(form.processing).toBe(true)
    expect(form.errors).toEqual({})
    expect(form.wasSuccessful).toBe(false)
  })
})
