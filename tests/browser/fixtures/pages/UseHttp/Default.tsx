import { HttpCancelledError } from '@inertiajs/core'
import { useHttp } from '@engblock/inertia-solid'
import { createSignal } from 'solid-js'

export default function Default() {
  const form = useHttp<{ name: string }, { method: string; data: { name: string } }>({ name: '' })
  const [result, setResult] = createSignal('')
  const [cancelled, setCancelled] = createSignal(false)

  const save = async () => {
    const response = await form.post('/api/use-http', {
      headers: { 'X-Custom': 'solid' },
      onSuccess: (_data, httpResponse) => setResult(httpResponse.headers['x-response-metadata'] ?? ''),
    })
    setResult(`${response.method}:${response.data.name}:${result()}`)
  }

  const validate = () => form.post('/api/use-http/validation')

  const saveOptimistically = async () => {
    try {
      await form
        .optimistic((data) => ({ name: `${data.name} (saving)` }))
        .post('/api/use-http/slow')
    } catch (error) {
      if (error instanceof HttpCancelledError) setCancelled(true)
    }
  }

  return (
    <main>
      <input id="name" value={form.data.name} onInput={(event) => form.setData('name', event.currentTarget.value)} />
      <button id="save" type="button" onClick={save}>Save</button>
      <button id="validate" type="button" onClick={validate}>Validate</button>
      <button id="optimistic" type="button" onClick={saveOptimistically}>Optimistic</button>
      <button id="cancel" type="button" onClick={() => form.cancel()}>Cancel</button>
      <output id="result">{result()}</output>
      <output id="processing">{form.processing ? 'processing' : 'idle'}</output>
      <output id="response">{form.response?.method ?? ''}</output>
      <output id="name-value">{form.data.name}</output>
      <output id="name-error">{form.errors.name ?? ''}</output>
      <output id="cancelled">{cancelled() ? 'cancelled' : ''}</output>
    </main>
  )
}
