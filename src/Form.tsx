import {
  FormComponentResetSymbol,
  formDataToObject,
  isUrlMethodPair,
  mergeDataIntoQueryString,
  resetFormFields,
  resolveUrlMethodPairComponent,
  UseFormUtils,
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
import type { NamedInputEvent, ValidationConfig, Validator } from 'laravel-precognition'
import { createContext, createEffect, createSignal, omit, onSettled, untrack, useContext } from 'solid-js'
import { config } from './config'
import useForm, { type InertiaPrecognitiveForm } from './useForm'

type FormSubmitOptions = Omit<VisitOptions, 'data' | 'onPrefetched' | 'onPrefetching'>
type NamedFormEvent = NamedInputEvent | { readonly target: EventTarget & { name: string } }
type FormSubmitter = HTMLButtonElement | HTMLInputElement | null

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
  validator(): Validator
  valid<K extends FormDataKeys<TForm>>(field: K): boolean
  invalid<K extends FormDataKeys<TForm>>(field: K): boolean
  validate(
    field?: FormDataKeys<TForm> | NamedFormEvent | ValidationConfig,
    config?: ValidationConfig,
  ): FormComponentRef<TForm>
  touch<K extends FormDataKeys<TForm>>(field: K | NamedFormEvent | Array<K>, ...fields: K[]): FormComponentRef<TForm>
  touched<K extends FormDataKeys<TForm>>(field?: K): boolean
}

export interface FormComponentState<TForm extends object = Record<string, any>> {
  readonly errors: FormDataErrors<TForm>
  readonly hasErrors: boolean
  readonly processing: boolean
  readonly progress: Progress | null
  readonly wasSuccessful: boolean
  readonly recentlySuccessful: boolean
  readonly isDirty: boolean
  readonly validating: boolean
}

export type FormComponentSlotProps<TForm extends object = Record<string, any>> = FormComponentMethods<TForm> &
  FormComponentState<TForm>
export type FormComponentRef<TForm extends object = Record<string, any>> = FormComponentSlotProps<TForm>

export type FormProps<TForm extends object = Record<string, any>> = FormComponentProps<TForm> &
  Omit<
    JSX.FormHTMLAttributes<HTMLFormElement>,
    keyof FormComponentProps<TForm> | 'action' | 'children' | 'method' | 'ref'
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
  const form = useForm<Record<string, any>>({}) as InertiaPrecognitiveForm<Record<string, any>>
  const [isDirty, setIsDirty] = createSignal(false)
  let formElement: HTMLFormElement | undefined
  let defaultData: FormData | undefined

  const baseMethod = (): Method =>
    isUrlMethodPair(props.action) ? props.action.method : ((props.method ?? 'get').toLowerCase() as Method)
  const baseAction = () => (isUrlMethodPair(props.action) ? props.action.url : (props.action ?? ''))

  const getFormData = (submitter: FormSubmitter = null) =>
    formElement ? new FormData(formElement, submitter) : new FormData()
  const getData = (submitter: FormSubmitter = null) =>
    formDataToObject(getFormData(submitter)) as TForm & Record<string, FormDataConvertible>
  const getUrlAndData = (submitter: FormSubmitter = null) =>
    mergeDataIntoQueryString(baseMethod(), baseAction(), getData(submitter), props.queryStringArrayFormat ?? 'brackets')
  const getTransformedData = () => props.transform?.(getUrlAndData()[1] as TForm) ?? getUrlAndData()[1]

  form
    .withPrecognition(
      () => baseMethod(),
      () => getUrlAndData()[0],
    )
    .transform(() => getTransformedData())

  untrack(() => {
    form.setValidationTimeout(props.validationTimeout ?? 1500)
    if (props.validateFiles) form.validateFiles()
    if (props.withAllErrors ?? config.get('form.withAllErrors')) form.withAllErrors()
  })
  createEffect(
    () => props.validationTimeout ?? 1500,
    (timeout) => {
      form.setValidationTimeout(timeout)
    },
    { defer: true },
  )
  createEffect(
    () => props.validateFiles ?? false,
    (validateFiles) => {
      if (validateFiles) form.validateFiles()
      else form.withoutFileValidation()
    },
    { defer: true },
  )
  createEffect(
    () => props.withAllErrors ?? config.get('form.withAllErrors'),
    (withAllErrors) => {
      if (withAllErrors) form.withAllErrors()
    },
    { defer: true },
  )

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
        (props.instant && isUrlMethodPair(props.action) ? resolveUrlMethodPairComponent(props.action) : null),
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
    form.transform(() => getTransformedData())
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
    get validating() {
      return form.validating
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
    validator: form.validator,
    valid: form.valid,
    invalid: form.invalid,
    validate: (field, validationConfig) => {
      form.validate(
        ...UseFormUtils.mergeHeadersForValidation(
          field as string | NamedInputEvent | ValidationConfig | undefined,
          field && typeof field === 'object' && 'target' in field ? (validationConfig ?? {}) : validationConfig,
          props.headers,
        ),
      )
      return exposed
    },
    touch: (field, ...fields) => {
      form.touch(field, ...fields)
      return exposed
    },
    touched: form.touched,
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
    'validateFiles',
    'validationTimeout',
    'withAllErrors',
    'children',
    'ref',
  )

  return (
    <FormContext value={exposed as unknown as FormComponentRef}>
      <form
        {...htmlProps}
        ref={(element) => (formElement = element)}
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
