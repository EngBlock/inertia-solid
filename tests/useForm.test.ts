import type { Page, Progress, VisitOptions } from '@inertiajs/core'
import { router } from '@inertiajs/core'
import { createRoot, flush } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useForm from '../src/useForm'

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
