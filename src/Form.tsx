import {
  FormComponentResetSymbol,
  formDataToObject,
  isUrlMethodPair,
  mergeDataIntoQueryString,
  resetFormFields,
  resolveUrlMethodPairComponent,
  type ErrorValue,
  type FormComponentProps,
  type FormDataConvertible,
  type FormDataErrors,
  type FormDataKeys,
  type Method,
  type Progress,
  type VisitOptions,
} from '@inertiajs/core'
import { isEqual } from 'es-toolkit'
import { type JSX } from '@solidjs/web'
import { createContext, createSignal, omit, onSettled, useContext } from 'solid-js'
import useForm from './useForm'

type FormSubmitOptions = Omit<VisitOptions, 'data' | 'onPrefetched' | 'onPrefetching'>
type FormSubmitter = HTMLButtonElement | HTMLInputElement | null

type SupportedFormComponentProps<TForm extends object> = Omit<
  FormComponentProps<TForm>,
  'validateFiles' | 'validationTimeout' | 'withAllErrors'
>

export interface FormComponentMethods<TForm extends object = Record<string, any>> {
  clearErrors<K extends FormDataKeys<TForm>>(...fields: K[]): void
  resetAndClearErrors<K extends FormDataKeys<TForm>>(...fields: K[]): void
  setError: {
    <K extends FormDataKeys<TForm>>(field: K, value: ErrorValue): void
    (errors: FormDataErrors<TForm>): void
  }
  reset<K extends FormDataKeys<TForm>>(...fields: K[]): void
  submit(): void
  cancel(): void
  defaults(): void
  getData(): TForm
  getFormData(): FormData
}

export interface FormComponentState<TForm extends object = Record<string, any>> {
  readonly errors: FormDataErrors<TForm>
  readonly hasErrors: boolean
  readonly processing: boolean
  readonly progress: Progress | null
  readonly wasSuccessful: boolean
  readonly recentlySuccessful: boolean
  readonly isDirty: boolean
}

export type FormComponentSlotProps<TForm extends object = Record<string, any>> = FormComponentMethods<TForm> &
  FormComponentState<TForm>
export type FormComponentRef<TForm extends object = Record<string, any>> = FormComponentSlotProps<TForm>

export type FormProps<TForm extends object = Record<string, any>> = SupportedFormComponentProps<TForm> &
  Omit<
    JSX.FormHTMLAttributes<HTMLFormElement>,
    keyof SupportedFormComponentProps<TForm> | 'action' | 'children' | 'method' | 'ref'
  > & {
    children?: JSX.Element | ((form: FormComponentSlotProps<TForm>) => JSX.Element)
    ref?: (form: FormComponentRef<TForm>) => void
  }

export type TypedFormComponent<TForm extends object> = (props: FormProps<TForm>) => JSX.Element

const missingFormContext = Symbol('MissingFormContext')
const FormContext = createContext<FormComponentRef | typeof missingFormContext>(missingFormContext)

export function useFormContext<TForm extends object = Record<string, any>>() {
  const context = useContext(FormContext)
  return context === missingFormContext ? undefined : (context as unknown as FormComponentRef<TForm>)
}

export default function Form<TForm extends object = Record<string, any>>(props: FormProps<TForm>): JSX.Element {
  const form = useForm<Record<string, any>>({})
  const [isDirty, setIsDirty] = createSignal(false)
  let formElement: HTMLFormElement | undefined
  let defaultData: FormData | undefined

  const baseMethod = (): Method =>
    isUrlMethodPair(props.action)
      ? props.action.method
      : ((props.method ?? 'get').toLowerCase() as Method)
  const baseAction = () => (isUrlMethodPair(props.action) ? props.action.url : (props.action ?? ''))

  const getFormData = (submitter: FormSubmitter = null) =>
    formElement ? new FormData(formElement, submitter) : new FormData()
  const getData = (submitter: FormSubmitter = null) =>
    formDataToObject(getFormData(submitter)) as TForm & Record<string, FormDataConvertible>

  const clearErrors = (...fields: FormDataKeys<TForm>[]) => form.clearErrors(...fields)
  const reset = (...fields: FormDataKeys<TForm>[]) => {
    if (formElement && defaultData) {
      resetFormFields(formElement, defaultData, fields as string[])
      setIsDirty(!isEqual(getData(), formDataToObject(defaultData)))
    }
    form.reset(...fields)
  }
  const resetAndClearErrors = (...fields: FormDataKeys<TForm>[]) => {
    clearErrors(...fields)
    reset(...fields)
  }
  const defaults = () => {
    defaultData = getFormData()
    setIsDirty(false)
  }

  const submit = (submitter: FormSubmitter = null) => {
    const method = (submitter?.getAttribute('formmethod')?.toLowerCase() as Method | undefined) ?? baseMethod()
    const action = submitter?.getAttribute('formaction') ?? baseAction()
    const target = submitter?.getAttribute('formtarget') ?? formElement?.getAttribute('target')
    const encoding = submitter?.getAttribute('formenctype') ?? formElement?.getAttribute('enctype')
    const [url, data] = mergeDataIntoQueryString(
      method,
      action,
      getData(submitter),
      props.queryStringArrayFormat ?? 'brackets',
    )

    if (target === '_blank' && method === 'get') {
      window.open(url, '_blank')
      return
    }

    const maybeReset = (option: boolean | FormDataKeys<TForm>[] | undefined) => {
      if (option === true) reset()
      else if (Array.isArray(option) && option.length) reset(...option)
    }

    const options: FormSubmitOptions = {
      headers: props.headers ?? {},
      queryStringArrayFormat: props.queryStringArrayFormat ?? 'brackets',
      errorBag: props.errorBag ?? null,
      showProgress: props.showProgress ?? true,
      invalidateCacheTags: props.invalidateCacheTags ?? [],
      component:
        props.component ??
        (props.instant && isUrlMethodPair(props.action)
          ? resolveUrlMethodPairComponent(props.action)
          : null),
      optimistic: props.optimistic ? (pageProps) => props.optimistic!(pageProps, data as TForm) : undefined,
      forceFormData: encoding?.toLowerCase() === 'multipart/form-data',
      onCancelToken: props.onCancelToken,
      onBefore: props.onBefore,
      onStart: props.onStart,
      onProgress: props.onProgress,
      onFinish: props.onFinish,
      onCancel: props.onCancel,
      onSuccess: async (...args) => {
        const result = await props.onSuccess?.(...args)
        props.onSubmitComplete?.({ reset, defaults })
        maybeReset(props.resetOnSuccess as boolean | FormDataKeys<TForm>[] | undefined)
        if (props.setDefaultsOnSuccess) defaults()
        return result
      },
      onError: (...args) => {
        props.onError?.(...args)
        maybeReset(props.resetOnError as boolean | FormDataKeys<TForm>[] | undefined)
      },
      ...props.options,
    }

    form.transform(() => props.transform?.(data as TForm) ?? data)
    form.submit(method, url, options)
  }

  const exposed: FormComponentRef<TForm> = {
    get errors() {
      return form.errors as FormDataErrors<TForm>
    },
    get hasErrors() {
      return form.hasErrors
    },
    get processing() {
      return form.processing
    },
    get progress() {
      return form.progress
    },
    get wasSuccessful() {
      return form.wasSuccessful
    },
    get recentlySuccessful() {
      return form.recentlySuccessful
    },
    get isDirty() {
      return isDirty()
    },
    clearErrors,
    resetAndClearErrors,
    setError: form.setError as FormComponentMethods<TForm>['setError'],
    reset,
    submit: () => submit(),
    cancel: form.cancel,
    defaults,
    getData,
    getFormData,
  }

  const updateDirtyState = (event: Event) => {
    if (event.type === 'reset' && (event as CustomEvent).detail?.[FormComponentResetSymbol]) {
      event.preventDefault()
    }

    setIsDirty(event.type === 'reset' ? false : !isEqual(getData(), formDataToObject(defaultData ?? new FormData())))
  }

  onSettled(() => {
    defaultData = getFormData()
    form.setDefaults(getData())
    props.ref?.(exposed)

    for (const event of ['input', 'change', 'reset']) {
      formElement?.addEventListener(event, updateDirtyState)
    }

    return () => {
      for (const event of ['input', 'change', 'reset']) {
        formElement?.removeEventListener(event, updateDirtyState)
      }
      if (props.cancelOnUnmount) form.cancel()
    }
  })

  const htmlProps = omit(
    props,
    'action',
    'method',
    'headers',
    'queryStringArrayFormat',
    'errorBag',
    'showProgress',
    'transform',
    'optimistic',
    'options',
    'onCancelToken',
    'onBefore',
    'onStart',
    'onProgress',
    'onFinish',
    'onCancel',
    'onSuccess',
    'onError',
    'onSubmitComplete',
    'disableWhileProcessing',
    'cancelOnUnmount',
    'resetOnError',
    'resetOnSuccess',
    'setDefaultsOnSuccess',
    'invalidateCacheTags',
    'component',
    'instant',
    'children',
    'ref',
  )

  return (
    <FormContext value={exposed as unknown as FormComponentRef}>
      <form
        {...htmlProps}
        ref={formElement}
        action={baseAction()}
        method={baseMethod() as 'get' | 'post'}
        inert={props.disableWhileProcessing && form.processing ? true : undefined}
        onSubmit={(event) => {
          const submitter = (event as SubmitEvent).submitter as FormSubmitter
          const target = submitter?.getAttribute('formtarget') ?? event.currentTarget.getAttribute('target')

          if (target === '_blank' && (submitter?.getAttribute('formmethod') ?? baseMethod()).toLowerCase() !== 'get') {
            return
          }

          event.preventDefault()
          submit(submitter)
        }}
      >
        {typeof props.children === 'function' ? props.children(exposed) : props.children}
      </form>
    </FormContext>
  )
}

export function createForm<TForm extends object>(): TypedFormComponent<TForm> {
  return Form as TypedFormComponent<TForm>
}
