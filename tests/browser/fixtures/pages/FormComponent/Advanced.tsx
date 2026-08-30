import {
  createForm,
  type FormComponentRef,
  type FormComponentSlotProps,
  useFormContext,
} from '@engblock/inertia-solid'
import { createSignal } from 'solid-js'

type ProfileForm = {
  name: string
  email: string
  role: string
}

const AdvancedForm = createForm<ProfileForm>()

function OutsideForm() {
  return <p data-testid="outside-context">{String(useFormContext() === undefined)}</p>
}

function ContextControls(props: {
  surface: FormComponentSlotProps<ProfileForm>
  getRef: () => FormComponentRef<ProfileForm> | undefined
}) {
  const form = useFormContext<ProfileForm>()
  const [identity, setIdentity] = createSignal(false)
  const [data, setData] = createSignal('')

  if (!form) throw new Error('ContextControls must be rendered inside Form')

  return (
    <section>
      <p data-testid="context-same-slot">{String(form === props.surface)}</p>
      <p data-testid="context-dirty">{String(form.isDirty)}</p>
      <p data-testid="context-name-error">{form.errors.name}</p>
      <p data-testid="context-email-error">{form.errors.email}</p>
      <p data-testid="surface-identity">{String(identity())}</p>
      <pre data-testid="current-data">{data()}</pre>
      <button type="button" onClick={() => setIdentity(form === props.getRef())}>
        Compare surfaces
      </button>
      <button type="button" onClick={() => setData(JSON.stringify(form.getData()))}>
        Read data
      </button>
      <button
        type="button"
        onClick={() =>
          form.setError({
            name: 'Name error',
            email: 'Email error',
          })
        }
      >
        Set errors
      </button>
      <button type="button" onClick={() => form.clearErrors('email')}>
        Clear email error
      </button>
      <button type="button" onClick={() => form.resetAndClearErrors('name')}>
        Reset and clear name
      </button>
      <button type="button" onClick={() => form.defaults()}>
        Set defaults
      </button>
      <button type="button" onClick={() => props.getRef()?.reset('email')}>
        Reset email from ref
      </button>
      <button type="button" onClick={() => props.getRef()?.submit()}>
        Submit from ref
      </button>
    </section>
  )
}

export default function Advanced() {
  let formRef: FormComponentRef<ProfileForm> | undefined
  const [completed, setCompleted] = createSignal(false)

  return (
    <main>
      <OutsideForm />
      <AdvancedForm
        action="/form-component/advanced"
        method="post"
        ref={(surface) => (formRef = surface)}
        onSubmitComplete={({ reset }) => {
          reset('email')
          setCompleted(true)
        }}
      >
        {(form) => (
          <>
            <label>
              Name
              <input name="name" value="Ada" />
            </label>
            <label>
              Email
              <input name="email" value="ada@example.com" />
            </label>
            <label>
              Role
              <select name="role">
                <option value="author">Author</option>
                <option value="editor">Editor</option>
              </select>
            </label>
            <button type="reset">Native reset</button>
            <p data-testid="slot-dirty">{String(form.isDirty)}</p>
            <p data-testid="completed">{String(completed())}</p>
            <ContextControls surface={form} getRef={() => formRef} />
          </>
        )}
      </AdvancedForm>
    </main>
  )
}
