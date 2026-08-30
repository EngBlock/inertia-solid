import { Form } from '@engblock/inertia-solid'

export default function Default() {
  return (
    <main>
      <Form action="/precognition/default" method="post" validationTimeout={0} headers={{ 'X-Test': 'solid' }}>
        {(form) => (
          <>
            <label>
              Name
              <input name="name" onBlur={(event) => form.validate(event)} />
            </label>
            <label>
              Email
              <input name="email" onBlur={(event) => form.validate(event)} />
            </label>
            <button type="button" onClick={() => form.validate({ only: ['name', 'email'] })}>
              Validate Both
            </button>
            {form.validating && <p>Validating...</p>}
            <p data-testid="name-error">{form.errors.name}</p>
            <p data-testid="email-error">{form.errors.email}</p>
            <p data-testid="name-valid">{form.valid('name') ? 'Name is valid!' : ''}</p>
            <p data-testid="name-touched">{form.touched('name') ? 'Name is touched' : 'Name is not touched'}</p>
          </>
        )}
      </Form>
    </main>
  )
}
