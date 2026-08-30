import { Head, Link, usePage } from '@engblock/inertia-solid'
import { Errored, Loading, createMemo, createSignal } from 'solid-js'
import AppLayout from '../Layouts/AppLayout'

type HomeProps = {
  adapter: string
  framework: string
  message: string
}

type Fact = {
  detail: string
  topic: string
}

type Pulse = {
  sequence: number
  servedAt: string
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export default function Home(props: HomeProps) {
  const page = usePage<HomeProps>()
  const [topic, setTopic] = createSignal('adapter')
  const [pulseSequence, setPulseSequence] = createSignal(1)

  const fact = createMemo(async () => getJson<Fact>(`/async/fact?topic=${encodeURIComponent(topic())}`))
  const pulse = createMemo(async () => getJson<Pulse>(`/async/pulse/${pulseSequence()}`))

  return (
    <AppLayout>
      <Head
        title="Home"
        tags={[
          {
            tag: 'meta',
            headKey: 'description',
            attrs: { name: 'description', content: 'Laravel, Inertia, and Solid working together.' },
          },
        ]}
      />

      <main class="hero">
        <p class="eyebrow">Integration playground</p>
        <h1>{props.message}</h1>
        <p class="lede">
          This page was rendered by {page.props.framework} and hydrated with {page.props.adapter}.
        </p>
        <div class="actions">
          <Link href="/about" class="button">
            Test an Inertia visit
          </Link>
          <a href="#async-demo" class="text-link">
            Try reactive async calls ↓
          </a>
        </div>
      </main>

      <section id="async-demo" class="async-demo" aria-labelledby="async-title">
        <div>
          <p class="eyebrow">Solid 2 async graph</p>
          <h2 id="async-title">Reactive Laravel calls</h2>
          <p class="async-intro">
            Changing a signal invalidates its async memo. Each result is revealed by its own loading boundary.
          </p>
        </div>

        <div class="async-grid">
          <article class="async-card">
            <div class="card-heading">
              <h3>Topic lookup</h3>
              <span>signal → memo → fetch</span>
            </div>
            <div class="topic-picker" aria-label="Choose a topic">
              {['adapter', 'inertia', 'solid'].map((value) => (
                <button
                  type="button"
                  class={topic() === value ? 'selected' : undefined}
                  onClick={() => setTopic(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <Errored fallback={(error) => <p class="async-error">{String(error())}</p>}>
              <Loading on={topic} fallback={<p class="async-loading">Loading topic…</p>}>
                <p class="async-result">{fact().detail}</p>
              </Loading>
            </Errored>
          </article>

          <article class="async-card">
            <div class="card-heading">
              <h3>Server pulse</h3>
              <span>reactive refresh</span>
            </div>
            <Errored fallback={(error) => <p class="async-error">{String(error())}</p>}>
              <Loading on={pulseSequence} fallback={<p class="async-loading">Calling Laravel…</p>}>
                <dl class="pulse-result">
                  <div>
                    <dt>Request</dt>
                    <dd>#{pulse().sequence}</dd>
                  </div>
                  <div>
                    <dt>Served</dt>
                    <dd>{new Date(pulse().servedAt).toLocaleTimeString()}</dd>
                  </div>
                </dl>
              </Loading>
            </Errored>
            <button type="button" class="button secondary" onClick={() => setPulseSequence((value) => value + 1)}>
              Call again
            </button>
          </article>
        </div>
      </section>
    </AppLayout>
  )
}
