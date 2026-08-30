import { Head } from '@engblock/inertia-solid'
import { createSignal } from 'solid-js'

export default function Reactive() {
  const [title, setTitle] = createSignal('Initial Title')
  const [description, setDescription] = createSignal('Initial description')

  return (
    <>
      <Head
        title={title()}
        tags={[
          { tag: 'meta', headKey: 'description', attrs: { name: 'description', content: description() } },
          { tag: 'meta', attrs: { name: 'author', content: 'Test Author' } },
        ]}
      />
      <div>
        <h1>Dynamic Head Updates</h1>
        <button
          id="update-meta"
          onClick={() => {
            setTitle('Updated Title')
            setDescription('Updated description')
          }}
        >
          Update Meta
        </button>
        <p>Current title: {title()}</p>
        <p>Current description: {description()}</p>
      </div>
    </>
  )
}
