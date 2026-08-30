import {
  hasFiles,
  http,
  HttpCancelledError,
  HttpResponseError,
  mergeDataIntoQueryString,
  objectToFormData,
  UseFormUtils,
  type CancelToken,
  type Errors,
  type ErrorValue,
  type FormDataConvertible,
  type FormDataErrors,
  type FormDataKeys,
  type FormDataType,
  type FormDataValues,
  type HttpProgressEvent,
  type Method,
  type Progress,
  type UrlMethodPair,
  type UseFormArguments,
  type UseFormTransformCallback,
  type UseFormWithPrecognitionArguments,
  type UseHttpSubmitArguments,
  type UseHttpSubmitOptions,
} from '@inertiajs/core'
import { cloneDeep } from 'es-toolkit'
import { toSimpleValidationErrors } from 'laravel-precognition'
import { createStore, flush, onCleanup } from 'solid-js'
import useForm, {
  HTTP_FORM_STATE,
  type HttpFormState,
  type InertiaForm,
  type InertiaFormValidation,
  type SetDataAction,
} from './useForm'

export interface HttpForm<TForm extends object, TResponse = unknown>
  extends Omit<
    InertiaForm<TForm>,
    'submit' | 'get' | 'post' | 'put' | 'patch' | 'delete' | 'dontRemember' | 'optimistic' | 'withPrecognition'
  > {
  readonly response: TResponse | null
  setData: SetDataAction<TForm>
  transform(callback: UseFormTransformCallback<TForm>): void
  setDefaults: {
    (): void
    <K extends FormDataKeys<TForm>>(field: K, value: FormDataValues<TForm, K>): void
    (fields: Partial<TForm>): void
  }
  setError: {
    <K extends FormDataKeys<TForm>>(field: K, value: ErrorValue): void
    (errors: FormDataErrors<TForm>): void
  }
  submit(...args: UseHttpSubmitArguments<TResponse, TForm>): Promise<TResponse>
  get(url: string, options?: UseHttpSubmitOptions<TResponse, TForm>): Promise<TResponse>
  post(url: string, options?: UseHttpSubmitOptions<TResponse, TForm>): Promise<TResponse>
  put(url: string, options?: UseHttpSubmitOptions<TResponse, TForm>): Promise<TResponse>
  patch(url: string, options?: UseHttpSubmitOptions<TResponse, TForm>): Promise<TResponse>
  delete(url: string, options?: UseHttpSubmitOptions<TResponse, TForm>): Promise<TResponse>
  dontRemember<K extends FormDataKeys<TForm>>(...fields: K[]): HttpForm<TForm, TResponse>
  optimistic(callback: (currentData: TForm) => Partial<TForm> | void): HttpForm<TForm, TResponse>
  withAllErrors(): HttpForm<TForm, TResponse>
  withPrecognition(...args: UseFormWithPrecognitionArguments): HttpPrecognitiveForm<TForm, TResponse>
}

export type HttpPrecognitiveForm<TForm extends object, TResponse = unknown> = HttpForm<TForm, TResponse> &
  InertiaFormValidation<TForm>

type OptimisticEntry<TForm> = {
  patch: Partial<TForm>
  status: 'pending' | 'successful' | 'failed'
}

export default function useHttp<TForm extends FormDataType<TForm>, TResponse = unknown>(
  method: Method | (() => Method),
  url: string | (() => string),
  data: TForm | (() => TForm),
): HttpPrecognitiveForm<TForm, TResponse>
export default function useHttp<TForm extends FormDataType<TForm>, TResponse = unknown>(
  urlMethodPair: UrlMethodPair | (() => UrlMethodPair),
  data: TForm | (() => TForm),
): HttpPrecognitiveForm<TForm, TResponse>
export default function useHttp<TForm extends FormDataType<TForm>, TResponse = unknown>(
  rememberKey: string,
  data: TForm | (() => TForm),
): HttpForm<TForm, TResponse>
export default function useHttp<TForm extends FormDataType<TForm>, TResponse = unknown>(
  data: TForm | (() => TForm),
): HttpForm<TForm, TResponse>
export default function useHttp<TForm extends FormDataType<TForm>, TResponse = unknown>(): HttpForm<TForm, TResponse>
export default function useHttp<TForm extends FormDataType<TForm>, TResponse = unknown>(
  ...args: UseFormArguments<TForm>
): HttpForm<TForm, TResponse> | HttpPrecognitiveForm<TForm, TResponse> {
  const parsedArguments = UseFormUtils.parseUseFormArguments<TForm>(...args)
  let precognitionEndpoint = parsedArguments.precognitionEndpoint
  const baseForm = (useForm as (...formArgs: any[]) => InertiaForm<TForm> & InertiaFormValidation<TForm>)(...args)
  const internal = (baseForm as typeof baseForm & { [HTTP_FORM_STATE]: HttpFormState<TForm> })[HTTP_FORM_STATE]
  const [httpState, setHttpState] = createStore<{ response: TResponse | null }>({ response: null })
  const controllers = new Map<number, AbortController>()
  const optimisticEntries = new Map<number, OptimisticEntry<TForm>>()
  let optimisticBase: TForm | null = null
  let nextRequest = 0
  let latestRequest = 0
  let disposed = false
  let pendingOptimistic: ((currentData: TForm) => Partial<TForm> | void) | null = null
  let deferredDefaultsRevision: number | null = null
  let allErrors = false

  onCleanup(() => {
    disposed = true
    controllers.forEach((controller) => controller.abort())
    controllers.clear()
  })

  const ownsState = (request: number) => !disposed && request === latestRequest

  const projectOptimism = () => {
    if (disposed || !optimisticBase) return
    const data = [...optimisticEntries.values()].reduce((current, entry) => {
      return entry.status === 'failed' ? current : Object.assign(current, cloneDeep(entry.patch))
    }, cloneDeep(optimisticBase))
    baseForm.setData(data)

    if ([...optimisticEntries.values()].every((entry) => entry.status !== 'pending')) {
      optimisticBase = null
      optimisticEntries.clear()
    }
  }

  const settleOptimism = (request: number, status: 'successful' | 'failed') => {
    const entry = optimisticEntries.get(request)
    if (!entry) return
    entry.status = status
    projectOptimism()
    if (optimisticEntries.size === 0 && deferredDefaultsRevision !== null) {
      internal.commitDefaults(deferredDefaultsRevision)
      deferredDefaultsRevision = null
    }
  }

  const parseResponse = (data: unknown): TResponse =>
    (typeof data === 'string' ? (data.length ? JSON.parse(data) : null) : data) as TResponse

  const submitRequest = async (
    method: Method,
    url: string,
    options: UseHttpSubmitOptions<TResponse, TForm> = {},
  ): Promise<TResponse> => {
    if (options.onBefore?.() === false) {
      throw new Error('Request cancelled by onBefore')
    }

    const request = ++nextRequest
    latestRequest = request
    internal.prepare()
    const defaultsRevision = internal.defaultsRevision()
    const controller = new AbortController()
    controllers.set(request, controller)
    const cancelToken: CancelToken = { cancel: () => controller.abort() }
    options.onCancelToken?.(cancelToken)

    const optimistic = options.optimistic ?? pendingOptimistic ?? undefined
    pendingOptimistic = null
    if (optimistic) {
      const current = internal.data()
      const patch = optimistic(cloneDeep(current))
      if (patch) {
        if (!optimisticBase) optimisticBase = cloneDeep(current)
        optimisticEntries.set(request, { patch: cloneDeep(patch), status: 'pending' })
        projectOptimism()
      }
    }

    internal.processing(true)
    options.onStart?.()

    const transformedData = internal.transform() as Record<string, FormDataConvertible>
    let requestUrl = url
    let requestData: FormData | string | undefined
    let contentType: string | undefined

    if (method === 'get') {
      ;[requestUrl] = mergeDataIntoQueryString(method, url, transformedData)
    } else if (hasFiles(transformedData)) {
      requestData = objectToFormData(transformedData)
    } else {
      requestData = JSON.stringify(transformedData)
      contentType = 'application/json'
    }

    try {
      const httpResponse = await http.getClient().request({
        method,
        url: requestUrl,
        data: requestData,
        headers: {
          Accept: 'application/json',
          ...(contentType ? { 'Content-Type': contentType } : {}),
          ...options.headers,
        },
        signal: controller.signal,
        onUploadProgress: (event: HttpProgressEvent) => {
          if (ownsState(request)) internal.progress(event)
          options.onProgress?.(event)
        },
      })

      const responseData = parseResponse(httpResponse.data)
      if (httpResponse.status < 200 || httpResponse.status >= 300) {
        throw new HttpResponseError(`Request failed with status ${httpResponse.status}`, httpResponse, url)
      }

      settleOptimism(request, 'successful')
      if (ownsState(request)) {
        internal.successful()
        setHttpState((draft) => {
          draft.response = responseData
        })
        flush()
      }
      options.onSuccess?.(responseData, httpResponse)
      if (ownsState(request)) {
        if (optimisticEntries.size === 0) internal.commitDefaults(defaultsRevision)
        else deferredDefaultsRevision = defaultsRevision
      }
      return responseData
    } catch (error: unknown) {
      settleOptimism(request, 'failed')

      if (error instanceof HttpResponseError) {
        if (error.response.status === 422) {
          const body = parseResponse(error.response.data) as { errors?: Record<string, string | string[]> } | null
          const errors = body?.errors ?? {}
          const processed = (allErrors ? errors : toSimpleValidationErrors(errors as any)) as FormDataErrors<TForm>
          if (ownsState(request)) {
            baseForm.clearErrors()
            baseForm.setError(processed)
            flush()
          }
          options.onError?.(processed as Errors)
          return undefined as TResponse
        }

        options.onHttpException?.(error.response)
        throw error
      }

      if (
        error instanceof HttpCancelledError ||
        (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
      ) {
        options.onCancel?.()
        throw error instanceof HttpCancelledError
          ? error
          : new HttpCancelledError('Request was cancelled', url)
      }

      options.onNetworkError?.(error instanceof Error ? error : new Error('Unknown error'))
      throw error
    } finally {
      controllers.delete(request)
      if (!disposed) {
        internal.processing(controllers.size > 0)
        if (ownsState(request)) internal.progress(null)
      }
      options.onFinish?.()
    }
  }

  const originalWithPrecognition = baseForm.withPrecognition.bind(baseForm)
  const originalWithAllErrors = baseForm.withAllErrors.bind(baseForm)
  const form = baseForm as unknown as HttpPrecognitiveForm<TForm, TResponse>
  Object.defineProperty(form, 'response', {
    enumerable: true,
    get: () => httpState.response,
  })
  Object.assign(form, {
    submit(...submitArgs: UseHttpSubmitArguments<TResponse, TForm>) {
      const parsed = UseFormUtils.parseSubmitArguments(submitArgs as any, precognitionEndpoint)
      return submitRequest(parsed.method, parsed.url, parsed.options as UseHttpSubmitOptions<TResponse, TForm>)
    },
    get: (url: string, options: UseHttpSubmitOptions<TResponse, TForm> = {}) => submitRequest('get', url, options),
    post: (url: string, options: UseHttpSubmitOptions<TResponse, TForm> = {}) => submitRequest('post', url, options),
    put: (url: string, options: UseHttpSubmitOptions<TResponse, TForm> = {}) => submitRequest('put', url, options),
    patch: (url: string, options: UseHttpSubmitOptions<TResponse, TForm> = {}) => submitRequest('patch', url, options),
    delete: (url: string, options: UseHttpSubmitOptions<TResponse, TForm> = {}) => submitRequest('delete', url, options),
    cancel() {
      controllers.get(latestRequest)?.abort()
    },
    optimistic(callback: (currentData: TForm) => Partial<TForm> | void) {
      pendingOptimistic = callback
      return form
    },
    withAllErrors() {
      allErrors = true
      originalWithAllErrors()
      return form
    },
    withPrecognition(...endpoint: UseFormWithPrecognitionArguments) {
      precognitionEndpoint = UseFormUtils.createWayfinderCallback(...endpoint)
      originalWithPrecognition(...endpoint)
      return form
    },
  })

  return form
}
