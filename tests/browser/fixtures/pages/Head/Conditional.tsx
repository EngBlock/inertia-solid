import { Head } from '@engblock/inertia-solid'
import { createSignal } from 'solid-js'

export default function Conditional() {
  const [showDescription, setShowDescription] = createSignal(true)
  const [showKeywords, setShowKeywords] = createSignal(false)

  return (
    <>
      <Head
        title="Conditional Rendering"
        tags={[
          ...(showDescription()
            ? [
                {
                  tag: 'meta',
                  headKey: 'description',
                  attrs: { name: 'description', content: 'This description is conditionally rendered' },
                },
              ]
            : []),
          ...(showKeywords()
            ? [
                {
                  tag: 'meta',
                  headKey: 'keywords',
                  attrs: { name: 'keywords', content: 'vue, test, conditional' },
                },
              ]
            : []),
          { tag: 'meta', attrs: { name: 'always-present', content: 'This is always here' } },
        ]}
      />
      <div>
        <h1>Conditional Head Rendering</h1>
        <button id="toggle-description" onClick={() => setShowDescription((value) => !value)}>
          {showDescription() ? 'Hide' : 'Show'} Description
        </button>
        <button id="toggle-keywords" onClick={() => setShowKeywords((value) => !value)}>
          {showKeywords() ? 'Hide' : 'Show'} Keywords
        </button>
        <p>Description visible: {showDescription().toString()}</p>
        <p>Keywords visible: {showKeywords().toString()}</p>
      </div>
    </>
  )
}
