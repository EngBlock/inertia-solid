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
  type UseFormWithPrecognitionArguments,
  type VisitOptions,
} from '@inertiajs/core'
import { cloneDeep, isEqual } from 'es-toolkit'
import { get, has, set, unset } from 'es-toolkit/compat'
import {
  createValidator,
  resolveName,
  toSimpleValidationErrors,
  type NamedInputEvent,
  type PrecognitionPath,
  type ValidationConfig,
  type Validator,
} from 'laravel-precognition'
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

type NamedFormEvent = NamedInputEvent | { readonly target: EventTarget & { name: string } }

type PrecognitionValidationConfig<TKeys> = ValidationConfig & {
  only?: TKeys[] | Iterable<TKeys> | ArrayLike<TKeys>
}

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
  withPrecognition(...args: UseFormWithPrecognitionArguments): InertiaPrecognitiveForm<TForm>
}

export interface InertiaFormValidation<TForm extends object> {
  invalid<K extends FormDataKeys<TForm>>(field: K): boolean
  setValidationTimeout(duration: number): InertiaPrecognitiveForm<TForm>
  touch<K extends FormDataKeys<TForm>>(
    field: K | NamedFormEvent | Array<K>,
    ...fields: K[]
  ): InertiaPrecognitiveForm<TForm>
  touched<K extends FormDataKeys<TForm>>(field?: K): boolean
  valid<K extends FormDataKeys<TForm>>(field: K): boolean
  validate<K extends FormDataKeys<TForm> | PrecognitionPath<TForm>>(
    field?: K | NamedFormEvent | PrecognitionValidationConfig<K>,
    config?: PrecognitionValidationConfig<K>,
  ): InertiaPrecognitiveForm<TForm>
  validateFiles(): InertiaPrecognitiveForm<TForm>
  readonly validating: boolean
  validator(): Validator
  withAllErrors(): InertiaPrecognitiveForm<TForm>
  withoutFileValidation(): InertiaPrecognitiveForm<TForm>
  setErrors(errors: FormDataErrors<TForm>): InertiaPrecognitiveForm<TForm>
  forgetError<K extends FormDataKeys<TForm> | NamedFormEvent>(field: K): InertiaPrecognitiveForm<TForm>
}

export type InertiaPrecognitiveForm<TForm extends object> = InertiaForm<TForm> & InertiaFormValidation<TForm>

type FormState<TForm extends object> = {
  data: TForm
  defaults: TForm
  errors: FormDataErrors<TForm>
  processing: boolean
  progress: Progress | null
  wasSuccessful: boolean
  recentlySuccessful: boolean
  validating: boolean
  touched: string[]
  valid: string[]
}

export const HTTP_FORM_STATE: unique symbol = Symbol('HTTP_FORM_STATE')

export interface HttpFormState<TForm extends object> {
  data(): TForm
  transform(): object
  defaultsRevision(): number
  commitDefaults(revision: number): void
  prepare(): void
  processing(value: boolean): void
  progress(value: Progress | null): void
  successful(): void
}

export default function useForm<TForm extends FormDataType<TForm>>(
  method: Method | (() => Method),
  url: string | (() => string),
  data: TForm | (() => TForm),
): InertiaPrecognitiveForm<TForm>
export default function useForm<TForm extends FormDataType<TForm>>(
  urlMethodPair: UrlMethodPair | (() => UrlMethodPair),
  data: TForm | (() => TForm),
): InertiaPrecognitiveForm<TForm>
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
  const parsedArguments = UseFormUtils.parseUseFormArguments<TForm>(...args)
  const { rememberKey, data } = parsedArguments
  let precognitionEndpoint = parsedArguments.precognitionEndpoint
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
  let validator: Validator | null = null
  let withAllErrors: boolean | null = null
  let validationTimeout = 1500
  let validatesFiles = false
  let validationEpoch = 0
  let validationController: AbortController | null = null
  const activeValidationEpochs = new Set<number>()

  const [state, setState] = createStore<FormState<TForm>>({
    data: cloneDeep(canonicalData),
    defaults: cloneDeep(canonicalDefaults),
    errors: cloneDeep(rememberedErrors ?? ({} as FormDataErrors<TForm>)),
    processing: false,
    progress: null,
    wasSuccessful: false,
    recentlySuccessful: false,
    validating: false,
    touched: [],
    valid: [],
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

  const cancelValidation = () => {
    validationEpoch += 1
    validationController?.abort()
    validationController = null
    if (state.validating) {
      setState((draft) => {
        draft.validating = false
      })
    }
  }

  onCleanup(() => {
    disposed = true
    clearTimeout(recentlySuccessfulTimeout)
    cancelValidation()
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
    validator?.defaults(cloneDeep(canonicalDefaults) as Record<string, unknown>)
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
    validator?.reset(...(fields as string[]))
  }

  const setError = ((fieldOrErrors: FormDataKeys<TForm> | FormDataErrors<TForm>, value?: ErrorValue) => {
    setState((draft) => {
      Object.assign(draft.errors, typeof fieldOrErrors === 'string' ? { [fieldOrErrors]: value } : fieldOrErrors)
    })
    validator?.setErrors(cloneDeep(state.errors))
    if (validator) {
      setState((draft) => {
        draft.valid = validator!.valid()
      })
    }
  }) as InertiaForm<TForm>['setError']

  const clearErrors = (...fields: FormDataKeys<TForm>[]) => {
    setState((draft) => {
      if (fields.length === 0) {
        draft.errors = {} as FormDataErrors<TForm>
        return
      }

      fields.forEach((field) => delete (draft.errors as Record<string, ErrorValue>)[field])
    })

    if (validator) {
      if (fields.length === 0) validator.setErrors({})
      else fields.forEach((field) => validator?.forgetError(field))
      setState((draft) => {
        draft.valid = validator!.valid()
      })
    }
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

  const markSuccessful = (submission?: number) => {
    if (disposed || (submission !== undefined && submission !== latestSubmission)) return

    const update = (callback: (draft: FormState<TForm>) => void) => {
      if (submission === undefined) {
        setState(callback)
        flush()
      } else {
        updateLifecycle(submission, callback)
      }
    }

    update((draft) => {
      draft.errors = {} as FormDataErrors<TForm>
      draft.wasSuccessful = true
      draft.recentlySuccessful = true
    })

    clearTimeout(recentlySuccessfulTimeout)
    recentlySuccessfulTimeout = setTimeout(() => {
      if (disposed || (submission !== undefined && submission !== latestSubmission)) return
      setState((draft) => {
        draft.recentlySuccessful = false
      })
      flush()
    }, config.get('form.recentlySuccessfulDuration'))
  }

  const submit = (...submitArgs: UseFormSubmitArguments) => {
    cancelValidation()
    flush()
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

  const withAllErrorsEnabled = () => withAllErrors ?? config.get('form.withAllErrors')

  const createPrecognitionValidator = () => {
    const epoch = validationEpoch
    let instance!: Validator
    instance = createValidator(
      (client) => {
        if (disposed || validator !== instance) return Promise.resolve(null)

        const controller = new AbortController()
        validationController?.abort()
        validationController = controller
        activeValidationEpochs.add(epoch)

        const { method, url } = precognitionEndpoint!()
        const transformedData = transform(cloneDeep(canonicalData)) as Record<string, unknown>
        return client[method](url, transformedData, { signal: controller.signal }).finally(() => {
          activeValidationEpochs.delete(epoch)
          if (!disposed && validator === instance && epoch === validationEpoch) {
            if (validationController === controller) validationController = null
            setState((draft) => {
              draft.validating = false
            })
            flush()
          }
        })
      },
      cloneDeep(canonicalDefaults) as Record<string, unknown>,
    )

    instance.setTimeout(validationTimeout)
    if (validatesFiles) instance.validateFiles()
    if (state.touched.length) instance.touch([...state.touched])
    if (Object.keys(state.errors).length) instance.setErrors(cloneDeep(state.errors))

    instance
      .on('validatingChanged', () => {
        if (disposed || validator !== instance) return
        setState((draft) => {
          draft.validating = instance.validating() && activeValidationEpochs.has(epoch)
        })
        flush()
      })
      .on('validatedChanged', () => {
        if (disposed || validator !== instance || !activeValidationEpochs.has(epoch)) return
        setState((draft) => {
          draft.valid = instance.valid()
        })
        flush()
      })
      .on('touchedChanged', () => {
        if (disposed || validator !== instance) return
        setState((draft) => {
          draft.touched = instance.touched()
        })
        flush()
      })
      .on('errorsChanged', () => {
        if (disposed || validator !== instance || !activeValidationEpochs.has(epoch)) return
        const errors = withAllErrorsEnabled() ? instance.errors() : toSimpleValidationErrors(instance.errors())
        setState((draft) => {
          draft.errors = cloneDeep(errors) as FormDataErrors<TForm>
          draft.valid = instance.valid()
        })
        flush()
      })

    return instance
  }

  const replacePrecognitionValidator = () => {
    if (precognitionEndpoint) validator = createPrecognitionValidator()
  }

  const initializePrecognition = (...endpoint: UseFormWithPrecognitionArguments) => {
    precognitionEndpoint = UseFormUtils.createWayfinderCallback(...endpoint)
    replacePrecognitionValidator()
  }

  const form = {
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
    get validating() {
      return state.validating
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
    withPrecognition(...endpoint: UseFormWithPrecognitionArguments) {
      cancelValidation()
      initializePrecognition(...endpoint)
      return form
    },
    validator() {
      if (!validator) throw new Error('Precognition is not configured for this form.')
      return validator
    },
    valid(field: FormDataKeys<TForm>) {
      return state.valid.includes(field as string)
    },
    invalid(field: FormDataKeys<TForm>) {
      return field in state.errors
    },
    touched(field?: FormDataKeys<TForm>) {
      return typeof field === 'string' ? state.touched.includes(field) : state.touched.length > 0
    },
    touch(
      field: FormDataKeys<TForm> | NamedFormEvent | Array<FormDataKeys<TForm>>,
      ...fields: FormDataKeys<TForm>[]
    ) {
      if (!validator) throw new Error('Precognition is not configured for this form.')
      if (Array.isArray(field)) validator.touch(field)
      else if (typeof field === 'string') validator.touch([field, ...fields])
      else validator.touch(field as NamedInputEvent)
      return form
    },
    validate(
      field?: FormDataKeys<TForm> | PrecognitionPath<TForm> | NamedFormEvent | ValidationConfig,
      validationConfig?: ValidationConfig,
    ) {
      if (!validator) throw new Error('Precognition is not configured for this form.')
      cancelValidation()
      replacePrecognitionValidator()

      if (field && typeof field === 'object' && !('target' in field)) {
        validator.validate(field)
      } else if (field === undefined) {
        validator.validate(validationConfig)
      } else {
        const fieldName = resolveName(field as string | NamedInputEvent)
        const transformedData = transform(cloneDeep(canonicalData)) as Record<string, unknown>
        validator.validate(fieldName, get(transformedData, fieldName), validationConfig)
      }

      return form
    },
    setValidationTimeout(duration: number) {
      if (!validator) throw new Error('Precognition is not configured for this form.')
      cancelValidation()
      validationTimeout = duration
      replacePrecognitionValidator()
      return form
    },
    validateFiles() {
      validatesFiles = true
      validator?.validateFiles()
      return form
    },
    withoutFileValidation() {
      validatesFiles = false
      validator?.withoutFileValidation()
      return form
    },
    withAllErrors() {
      withAllErrors = true
      return form
    },
    setErrors(errors: FormDataErrors<TForm>) {
      setError(errors)
      return form
    },
    forgetError(field: FormDataKeys<TForm> | NamedFormEvent) {
      clearErrors(resolveName(field as string | NamedInputEvent) as FormDataKeys<TForm>)
      return form
    },
    [HTTP_FORM_STATE]: {
      data: () => cloneDeep(canonicalData),
      transform: () => transform(cloneDeep(canonicalData)),
      defaultsRevision: () => defaultsRevision,
      commitDefaults(revision: number) {
        if (disposed || defaultsRevision !== revision) return
        canonicalDefaults = cloneDeep(canonicalData)
        projectDefaults()
        flush()
      },
      prepare() {
        if (disposed) return
        clearTimeout(recentlySuccessfulTimeout)
        setState((draft) => {
          draft.errors = {} as FormDataErrors<TForm>
          draft.wasSuccessful = false
          draft.recentlySuccessful = false
          draft.progress = null
        })
        flush()
      },
      processing(value: boolean) {
        if (disposed) return
        setState((draft) => {
          draft.processing = value
        })
        flush()
      },
      progress(value: Progress | null) {
        if (disposed) return
        setState((draft) => {
          draft.progress = value
        })
        flush()
      },
      successful: () => markSuccessful(),
    } satisfies HttpFormState<TForm>,
  } as InertiaPrecognitiveForm<TForm> & { [HTTP_FORM_STATE]: HttpFormState<TForm> }

  if (precognitionEndpoint) initializePrecognition(precognitionEndpoint)

  return form
}
