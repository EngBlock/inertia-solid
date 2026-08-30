import { Form } from '@engblock/inertia-solid'

export default function Errors() {
  return (
    <main>
      <h1>Form errors</h1>
      <Form action="/form-component/errors" method="post">
        {(form) => (
          <>
            <label>
              Name
              <input name="profile[name]" />
            </label>
            <button type="submit">Submit</button>
            <p data-testid="name-error">{form.errors['profile.name']}</p>
            <p data-testid="has-errors">{String(form.hasErrors)}</p>
          </>
        )}
      </Form>
    </main>
  )
}
