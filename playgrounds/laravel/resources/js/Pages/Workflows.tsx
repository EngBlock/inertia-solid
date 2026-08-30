import { Form, Head, InfiniteScroll, WhenVisible, setLayoutProps, useForm, useHttp } from '@engblock/inertia-solid'
import { For, createSignal } from 'solid-js'
import AppLayout from '../Layouts/AppLayout'

type User = {
  id: number
  name: string
}

type WorkflowsProps = {
  activity?: string
  users: { data: User[] }
}

function Workflows(props: WorkflowsProps) {
  const visitForm = useForm({ name: '' })
  const httpForm = useHttp<{ name: string }, { greeting: string }>({ name: '' })
  const [greeting, setGreeting] = createSignal('')

  const saveDirectly = async () => {
    const response = await httpForm.post('/api/profile')
    setGreeting(response.greeting)
  }

  return (
    <main class="content workflows">
      <Head title="Workflows" />
      <p class="eyebrow">Parity playground</p>
      <h1>Exercise the adapter workflows.</h1>
      <p class="lede">
        Every example imports the workspace adapter. Reactive state is read in JSX instead of being destructured
        eagerly.
      </p>

      <section>
        <h2>Helper-driven Inertia form</h2>
        <input
          aria-label="Helper name"
          value={visitForm.data.name}
          onInput={(event) => visitForm.setData('name', event.currentTarget.value)}
        />
        <button type="button" disabled={visitForm.processing} onClick={() => visitForm.post('/workflows/helper')}>
          Save through Inertia
        </button>
        <p>{visitForm.errors.name}</p>
      </section>

      <section>
        <h2>Native form with Precognition</h2>
        <Form<{ name: string }> action="/workflows/precognition" method="post" validationTimeout={250}>
          {(form) => (
            <>
              <input aria-label="Precognitive name" name="name" onBlur={(event) => form.validate(event)} />
              <button disabled={form.processing}>Submit native form</button>
              <p>{form.validating ? 'Validating…' : form.errors.name}</p>
            </>
          )}
        </Form>
      </section>

      <section>
        <h2>Direct HTTP form</h2>
        <input
          aria-label="HTTP name"
          value={httpForm.data.name}
          onInput={(event) => httpForm.setData('name', event.currentTarget.value)}
        />
        <button type="button" disabled={httpForm.processing} onClick={saveDirectly}>
          Save JSON
        </button>
        <p>{httpForm.errors.name ?? greeting()}</p>
      </section>

      <section>
        <h2>Dynamic persistent layout props</h2>
        <button type="button" onClick={() => setLayoutProps<{ accent: string }>('app', { accent: 'mint' })}>
          Change the layout accent
        </button>
      </section>

      <section style={{ 'margin-top': '60vh' }}>
        <h2>Visibility reload</h2>
        <WhenVisible data="activity" buffer={200} fallback={<p>Scroll to load recent activity…</p>}>
          <p>{props.activity}</p>
        </WhenVisible>
      </section>

      <section>
        <h2>Manual infinite scroll</h2>
        <InfiniteScroll
          data="users"
          manual
          onlyNext
          next={(state) =>
            state.hasMore ? (
              <button type="button" disabled={state.loading} onClick={state.fetch}>
                {state.loading ? 'Loading…' : 'Load more people'}
              </button>
            ) : (
              <p>Everyone is loaded.</p>
            )
          }
        >
          <ul class="feature-list">
            <For each={props.users.data}>{(user) => <li>{user.name}</li>}</For>
          </ul>
        </InfiniteScroll>
      </section>
    </main>
  )
}

Workflows.layout = {
  app: [AppLayout, { accent: 'violet' }],
}

export default Workflows
