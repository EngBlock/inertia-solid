import { useForm } from '@engblock/inertia-solid'

export default function SetDataThenPost() {
  const form = useForm({ code: 'initial', name: 'initial-name' })

  const setAndPost = () => {
    form.setData('code', '123456')
    form.post('/dump/post')
  }

  return (
    <main>
      <h1>Set data then post</h1>
      <p id="current-code">{form.data.code}</p>
      <button type="button" class="set-and-post" onClick={setAndPost}>
        Set and POST
      </button>
    </main>
  )
}
