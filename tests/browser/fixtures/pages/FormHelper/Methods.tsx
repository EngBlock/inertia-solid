import { useForm } from '@engblock/inertia-solid'

export default function Methods() {
  const form = useForm({ name: 'Ada' })

  return (
    <>
      <button onClick={() => form.get('/dump/get')}>GET</button>
      <button onClick={() => form.post('/dump/post')}>POST</button>
      <button onClick={() => form.put('/dump/put')}>PUT</button>
      <button onClick={() => form.patch('/dump/patch')}>PATCH</button>
      <button onClick={() => form.delete('/dump/delete')}>DELETE</button>
      <button onClick={() => form.submit('post', '/dump/post')}>Generic submit</button>
      <button onClick={() => form.submit({ method: 'patch', url: '/dump/patch' })}>Wayfinder submit</button>
    </>
  )
}
