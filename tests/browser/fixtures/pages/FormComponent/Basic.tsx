import { Form } from '@engblock/inertia-solid'

export default function Basic(props: { form?: Record<string, unknown> }) {
  return (
    <main>
      <h1>Native form</h1>
      <pre data-testid="submitted-form">{JSON.stringify(props.form ?? {})}</pre>
      <Form action="/form-component/basic" method="post" disableWhileProcessing>
        {(form) => (
          <>
            <label>
              Name
              <input name="profile[name]" value="Ada" />
            </label>
            <label>
              First tag
              <input name="tags[]" value="solid" />
            </label>
            <label>
              Second tag
              <input name="tags[]" value="inertia" />
            </label>
            <label>
              Active
              <input name="active" type="checkbox" value="1" checked />
            </label>
            <label>
              Birthday
              <input name="birthday" type="date" value="2000-01-02" />
            </label>
            <label>
              Avatar
              <input name="avatar" type="file" />
            </label>
            <button type="submit" name="intent" value="save">
              Save
            </button>
            <button
              type="submit"
              name="intent"
              value="publish"
              formaction="/dump/patch"
              formmethod={'patch' as 'post'}
              formenctype="multipart/form-data"
            >
              Publish
            </button>
            <button
              type="submit"
              name="intent"
              value="search"
              formaction="/dump/get"
              formmethod="get"
            >
              Search
            </button>
            <button
              type="submit"
              name="intent"
              value="preview"
              formaction="/dump/get"
              formmethod="get"
              formtarget="_blank"
            >
              Preview
            </button>
            <button type="button" onClick={() => form.reset()}>
              Reset
            </button>
            <p data-testid="processing">{String(form.processing)}</p>
            <p data-testid="successful">{String(form.wasSuccessful)}</p>
            <p data-testid="dirty">{String(form.isDirty)}</p>
            <p data-testid="progress">{form.progress?.percentage ?? 'none'}</p>
          </>
        )}
      </Form>
    </main>
  )
}
