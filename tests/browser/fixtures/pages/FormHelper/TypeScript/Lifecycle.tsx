import { useForm } from '@engblock/inertia-solid'

const wayfinder = { method: 'patch' as const, url: '/users/1' }

type FormData = {
  name: string
  password: string
}

export default function Lifecycle() {
  const form = useForm<FormData>({ name: 'Ada', password: '' })
  const remembered = useForm<FormData>('profile', { name: 'Ada', password: '' })
  const endpoint = useForm<FormData>(wayfinder, { name: 'Ada', password: '' })
  const dynamicEndpoint = useForm<FormData>(
    () => wayfinder,
    () => ({ name: 'Ada', password: '' }),
  )

  form.get('/users', { preserveState: true })
  form.post('/users', { errorBag: 'profile', invalidateCacheTags: ['users'] })
  form.put('/users/1', { preserveScroll: true })
  form.patch('/users/1', { preserveUrl: true, reset: ['users'] })
  form.delete('/users/1', { viewTransition: true })
  form.submit('post', '/users', { only: ['users'] })
  form.submit(wayfinder, { except: ['flash'] })
  endpoint.submit()
  dynamicEndpoint.submit({ showProgress: false })
  remembered.dontRemember('password').cancel()
  form.optimistic<{ users: string[] }>((props) => ({ users: [...props.users, form.data.name] })).post('/users')

  // @ts-expect-error invalid form field exclusion
  remembered.dontRemember('token')
  // @ts-expect-error invalid submission method
  form.submit('trace', '/users')
  // @ts-expect-error URL-method pairs require an Inertia method
  form.submit({ method: 'trace', url: '/users' })

  return null
}
