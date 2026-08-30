import {
  router,
  UseFormUtils,
  type CancelToken,
  type ErrorValue,
  type FormDataErrors,
  type FormDataKeys,
  type FormDataType,
  type FormDataValues,
  type Method,
  type OptimisticCallback,
  type Progress,
  type RequestPayload,
  type UrlMethodPair,
  type UseFormArguments,
  type UseFormSubmitArguments,
  type UseFormSubmitOptions,
  type UseFormTransformCallback,
  type VisitOptions,
} from '@inertiajs/core'
import { cloneDeep, isEqual } from 'es-toolkit'
import { get, has, set, unset } from 'es-toolkit/compat'
import { createEffect, createStore, flush, onCleanup, type Store } from 'solid-js'
import { config } from './config'

export type SetDataByObject<TForm> = (data: Partial<TForm>) => void
export type SetDataByMethod<TForm> = (data: (previousData: TForm) => TForm) => void
export type SetDataByKeyValuePair<TForm> = <K extends FormDataKeys<TForm>>(
  key: K,
  value: FormDataValues<TForm, K>,
) => void
export type SetDataAction<TForm extends object> = SetDataByObject<TForm> &
  SetDataByMethod<TForm> &
  SetDataByKeyValuePair<TForm>

export interface InertiaForm<TForm extends object> {
  readonly data: Store<TForm>
  readonly isDirty: boolean
  readonly errors: FormDataErrors<TForm>
  readonly hasErrors: boolean
  readonly processing: boolean
  readonly progress: Progress | null
  readonly wasSuccessful: boolean
  readonly recentlySuccessful: boolean
  setData: SetDataAction<TForm>
  transform(callback: UseFormTransformCallback<TForm>): void
  setDefaults: {
    (): void
    <K extends FormDataKeys<TForm>>(field: K, value: FormDataValues<TForm, K>): void
    (fields: Partial<TForm>): void
  }
  reset<K extends FormDataKeys<TForm>>(...fields: K[]): void
  clearErrors<K extends FormDataKeys<TForm>>(...fields: K[]): void
  resetAndClearErrors<K extends FormDataKeys<TForm>>(...fields: K[]): void
  setError: {
    <K extends FormDataKeys<TForm>>(field: K, value: ErrorValue): void
    (errors: FormDataErrors<TForm>): void
  }
  submit(...args: UseFormSubmitArguments): void
  get(url: string, options?: UseFormSubmitOptions): void
  post(url: string, options?: UseFormSubmitOptions): void
  put(url: string, options?: UseFormSubmitOptions): void
  patch(url: string, options?: UseFormSubmitOptions): void
  delete(url: string, options?: UseFormSubmitOptions): void
  cancel(): void
  dontRemember<K extends FormDataKeys<TForm>>(...fields: K[]): InertiaForm<TForm>
  optimistic<TProps>(callback: OptimisticCallback<TProps>): InertiaForm<TForm>
}

type FormState<TForm extends object> = {
  data: TForm
  defaults: TForm
  errors: FormDataErrors<TForm>
  processing: boolean
  progress: Progress | null
  wasSuccessful: boolean
  recentlySuccessful: boolean
}

export default function useForm<TForm extends FormDataType<TForm>>(
  method: Method | (() => Method),
  url: string | (() => string),
  data: TForm | (() => TForm),
): InertiaForm<TForm>
export default function useForm<TForm extends FormDataType<TForm>>(
  urlMethodPair: UrlMethodPair | (() => UrlMethodPair),
  data: TForm | (() => TForm),
): InertiaForm<TForm>
export default function useForm<TForm extends FormDataType<TForm>>(
  rememberKey: string,
  data: TForm | (() => TForm),
): InertiaForm<TForm>
export default function useForm<TForm extends FormDataType<TForm>>(
  data: TForm | (() => TForm),
): InertiaForm<TForm>
export default function useForm<TForm extends FormDataType<TForm>>(): InertiaForm<TForm>
export default function useForm<TForm extends FormDataType<TForm>>(
  ...args: UseFormArguments<TForm>
): InertiaForm<TForm> {
  const { rememberKey, data, precognitionEndpoint } = UseFormUtils.parseUseFormArguments<TForm>(...args)
  const isDataFunction = typeof data === 'function'
  const resolveData = () => (isDataFunction ? (data as () => TForm)() : data)
  const resolved = cloneDeep(resolveData())
  const rememberedData = rememberKey ? router.restore<TForm>(`${rememberKey}:data`) : undefined
  const rememberedErrors = rememberKey
    ? router.restore<FormDataErrors<TForm>>(`${rememberKey}:errors`)
    : undefined

  let canonicalData = rememberedData
    ? Object.assign(cloneDeep(resolved), cloneDeep(rememberedData))
    : cloneDeep(resolved)
  let canonicalDefaults = cloneDeep(resolved)
  let transform: UseFormTransformCallback<TForm> = (values) => values
  let disposed = false
  let defaultsRevision = 0
  let submissionCounter = 0
  let latestSubmission = 0
  let cancelToken: CancelToken | null = null
  let pendingOptimistic: OptimisticCallback | null = null
  let rememberExclusions: FormDataKeys<TForm>[] = []
  let recentlySuccessfulTimeout: ReturnType<typeof setTimeout> | undefined

  const [state, setState] = createStore<FormState<TForm>>({
    data: cloneDeep(canonicalData),
    defaults: cloneDeep(canonicalDefaults),
    errors: cloneDeep(rememberedErrors ?? ({} as FormDataErrors<TForm>)),
    processing: false,
    progress: null,
    wasSuccessful: false,
    recentlySuccessful: false,
  })

  if (rememberKey) {
    createEffect(
      () => cloneDeep(state.data),
      (data) => {
        const remembered = cloneDeep(data)
        rememberExclusions.forEach((field) => unset(remembered, field))
        router.remember(remembered, `${rememberKey}:data`)
      },
    )
    createEffect(
      () => cloneDeep(state.errors),
      (errors) => router.remember(errors, `${rememberKey}:errors`),
    )
  }

  onCleanup(() => {
    disposed = true
    clearTimeout(recentlySuccessfulTimeout)
  })

  const projectData = () => {
    setState((draft) => {
      draft.data = cloneDeep(canonicalData)
    })
  }

  const projectDefaults = () => {
    setState((draft) => {
      draft.defaults = cloneDeep(canonicalDefaults)
    })
  }

  const setData = ((keyOrData: FormDataKeys<TForm> | ((previousData: TForm) => TForm) | Partial<TForm>, value?: unknown) => {
    if (typeof keyOrData === 'string') {
      canonicalData = set(cloneDeep(canonicalData), keyOrData, value)
    } else if (typeof keyOrData === 'function') {
      canonicalData = cloneDeep(keyOrData(cloneDeep(canonicalData)))
    } else {
      canonicalData = cloneDeep(keyOrData) as TForm
    }

    projectData()
  }) as SetDataAction<TForm>

  const setDefaults = ((fieldOrFields?: FormDataKeys<TForm> | Partial<TForm>, value?: unknown) => {
    if (isDataFunction) {
      throw new Error('You cannot call `setDefaults()` when using a function to define your form data.')
    }

    defaultsRevision += 1

    if (fieldOrFields === undefined) {
      canonicalDefaults = cloneDeep(canonicalData)
    } else if (typeof fieldOrFields === 'string') {
      canonicalDefaults = set(cloneDeep(canonicalDefaults), fieldOrFields, value)
    } else {
      canonicalDefaults = Object.assign(cloneDeep(canonicalDefaults), cloneDeep(fieldOrFields))
    }

    projectDefaults()
  }) as InertiaForm<TForm>['setDefaults']

  const reset = (...fields: FormDataKeys<TForm>[]) => {
    const resetData = isDataFunction ? cloneDeep(resolveData()) : cloneDeep(canonicalDefaults)

    if (fields.length === 0) {
      canonicalData = resetData
      if (isDataFunction) {
        canonicalDefaults = cloneDeep(resetData)
        projectDefaults()
      }
    } else {
      const next = cloneDeep(canonicalData)
      fields.forEach((field) => {
        if (!has(resetData, field)) return
        const value = cloneDeep(get(resetData, field))
        set(next, field, value)
        if (isDataFunction) set(canonicalDefaults, field, cloneDeep(value))
      })
      canonicalData = next
      if (isDataFunction) projectDefaults()
    }

    projectData()
  }

  const setError = ((fieldOrErrors: FormDataKeys<TForm> | FormDataErrors<TForm>, value?: ErrorValue) => {
    setState((draft) => {
      Object.assign(draft.errors, typeof fieldOrErrors === 'string' ? { [fieldOrErrors]: value } : fieldOrErrors)
    })
  }) as InertiaForm<TForm>['setError']

  const clearErrors = (...fields: FormDataKeys<TForm>[]) => {
    setState((draft) => {
      if (fields.length === 0) {
        draft.errors = {} as FormDataErrors<TForm>
        return
      }

      fields.forEach((field) => delete (draft.errors as Record<string, ErrorValue>)[field])
    })
  }

  const resetAndClearErrors = (...fields: FormDataKeys<TForm>[]) => {
    reset(...fields)
    clearErrors(...fields)
  }

  const updateLifecycle = (submission: number, update: (draft: FormState<TForm>) => void) => {
    if (disposed || submission !== latestSubmission) return
    setState(update)
    flush()
  }

  const markSuccessful = (submission: number) => {
    if (disposed || submission !== latestSubmission) return

    updateLifecycle(submission, (draft) => {
      draft.errors = {} as FormDataErrors<TForm>
      draft.wasSuccessful = true
      draft.recentlySuccessful = true
    })

    clearTimeout(recentlySuccessfulTimeout)
    recentlySuccessfulTimeout = setTimeout(() => {
      updateLifecycle(submission, (draft) => {
        draft.recentlySuccessful = false
      })
    }, config.get('form.recentlySuccessfulDuration'))
  }

  const submit = (...submitArgs: UseFormSubmitArguments) => {
    const parsed = UseFormUtils.parseSubmitArguments(submitArgs, precognitionEndpoint)
    const { method, url, options } = parsed
    const submission = ++submissionCounter
    latestSubmission = submission
    const defaultsRevisionBeforeSuccess = defaultsRevision
    const optimistic = options.optimistic ?? pendingOptimistic ?? undefined
    pendingOptimistic = null

    const visitOptions: VisitOptions = {
      ...options,
      optimistic,
      onCancelToken: (token) => {
        if (!disposed && submission === latestSubmission) cancelToken = token
        return options.onCancelToken?.(token)
      },
      onBefore: (visit) => {
        updateLifecycle(submission, (draft) => {
          draft.wasSuccessful = false
          draft.recentlySuccessful = false
        })
        clearTimeout(recentlySuccessfulTimeout)
        const result = options.onBefore?.(visit)
        if (result === false) {
          updateLifecycle(submission, (draft) => {
            draft.processing = false
            draft.progress = null
          })
        }
        return result
      },
      onStart: (visit) => {
        updateLifecycle(submission, (draft) => {
          draft.processing = true
        })
        return options.onStart?.(visit)
      },
      onProgress: (event) => {
        updateLifecycle(submission, (draft) => {
          draft.progress = event ?? null
        })
        return options.onProgress?.(event)
      },
      onSuccess: async (page) => {
        markSuccessful(submission)
        const result = options.onSuccess ? await options.onSuccess(page) : undefined

        if (
          !disposed &&
          submission === latestSubmission &&
          defaultsRevision === defaultsRevisionBeforeSuccess
        ) {
          canonicalDefaults = cloneDeep(canonicalData)
          projectDefaults()
          flush()
        }

        return result
      },
      onError: (errors) => {
        if (!disposed && submission === latestSubmission) {
          updateLifecycle(submission, (draft) => {
            draft.errors = cloneDeep(errors) as FormDataErrors<TForm>
          })
        }
        return options.onError?.(errors)
      },
      onCancel: () => options.onCancel?.(),
      onFinish: (visit) => {
        updateLifecycle(submission, (draft) => {
          draft.processing = false
          draft.progress = null
        })
        if (submission === latestSubmission) cancelToken = null
        return options.onFinish?.(visit)
      },
    }

    const transformedData = transform(cloneDeep(canonicalData)) as RequestPayload

    if (method === 'delete') {
      router.delete(url, { ...visitOptions, data: transformedData })
    } else {
      router[method](url, transformedData, visitOptions)
    }
  }

  const form: InertiaForm<TForm> = {
    get data() {
      return state.data
    },
    get isDirty() {
      void state.data
      void state.defaults
      return !isEqual(canonicalData, canonicalDefaults)
    },
    get errors() {
      return state.errors
    },
    get hasErrors() {
      return Object.keys(state.errors).length > 0
    },
    get processing() {
      return state.processing
    },
    get progress() {
      return state.progress
    },
    get wasSuccessful() {
      return state.wasSuccessful
    },
    get recentlySuccessful() {
      return state.recentlySuccessful
    },
    setData,
    transform(callback) {
      transform = callback
    },
    setDefaults,
    reset,
    clearErrors,
    resetAndClearErrors,
    setError,
    submit,
    get: (url, options) => submit('get', url, options),
    post: (url, options) => submit('post', url, options),
    put: (url, options) => submit('put', url, options),
    patch: (url, options) => submit('patch', url, options),
    delete: (url, options) => submit('delete', url, options),
    cancel() {
      cancelToken?.cancel()
    },
    dontRemember(...fields) {
      rememberExclusions = fields
      if (rememberKey) projectData()
      return form
    },
    optimistic(callback) {
      pendingOptimistic = callback as OptimisticCallback
      return form
    },
  }

  return form
}
