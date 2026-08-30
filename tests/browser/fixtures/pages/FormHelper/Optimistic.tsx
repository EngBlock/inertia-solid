import { useForm, usePage } from '@engblock/inertia-solid'

export default function Optimistic() {
  const page = usePage<{ count: number }>()
  const form = useForm({ fail: false })
  const submit = (fail: boolean) => {
    form.setData('fail', fail)
    form.optimistic<{ count: number }>((props) => ({ count: props.count + 1 })).post('/form-helper/optimistic')
  }

  return (
    <>
      <div data-testid="count">{page.props.count}</div>
      <div data-testid="error">{form.errors.fail}</div>
      <button onClick={() => submit(false)}>Optimistic success</button>
      <button onClick={() => submit(true)}>Optimistic failure</button>
    </>
  )
}
