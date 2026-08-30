import { Show, createSignal } from 'solid-js'
import { useForm } from '@engblock/inertia-solid'

export default function Errors() {
  const form = useForm({ profile: { name: 'Ada' } })
  const [lifecycle, setLifecycle] = createSignal<string[]>([])

  const submit = () => {
    form.post('/form-helper/errors', {
      onStart: () => setLifecycle((events) => [...events, `start:${form.processing}`]),
      onError: () => setLifecycle((events) => [...events, `error:${form.hasErrors}`]),
      onFinish: () => setLifecycle((events) => [...events, `finish:${form.processing}`]),
    })
  }

  return (
    <main>
      <h1>Form errors</h1>
      <label>
        Name
        <input
          name="profile.name"
          value={form.data.profile.name}
          onInput={(event) => form.setData('profile.name', event.currentTarget.value)}
        />
      </label>
      <button type="button" onClick={submit}>
        Submit form
      </button>
      <p data-testid="lifecycle">{lifecycle().join(',')}</p>
      <Show when={form.errors['profile.name']}>{(error) => <p data-testid="name-error">{error()}</p>}</Show>
    </main>
  )
}
