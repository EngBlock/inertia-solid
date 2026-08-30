import { useForm } from '@engblock/inertia-solid'

export default function Default() {
  const form = useForm('post', '/precognition/default', { name: '', email: '' })
  form.setValidationTimeout(0)

  return (
    <main>
      <label>
        Name
        <input
          name="name"
          value={form.data.name}
          onInput={(event) => form.setData('name', event.currentTarget.value)}
          onBlur={(event) => form.validate(event)}
        />
      </label>
      <label>
        Email
        <input
          name="email"
          value={form.data.email}
          onInput={(event) => form.setData('email', event.currentTarget.value)}
          onBlur={(event) => form.validate(event)}
        />
      </label>
      <button type="button" onClick={() => form.validate({ only: ['name', 'email'] })}>
        Validate Both
      </button>
      <button type="button" onClick={() => form.submit()}>
        Submit
      </button>
      {form.validating && <p>Validating...</p>}
      <p data-testid="name-error">{form.errors.name}</p>
      <p data-testid="email-error">{form.errors.email}</p>
      <p data-testid="name-valid">{form.valid('name') ? 'Name is valid!' : ''}</p>
      <p data-testid="name-touched">{form.touched('name') ? 'Name is touched' : 'Name is not touched'}</p>
    </main>
  )
}
