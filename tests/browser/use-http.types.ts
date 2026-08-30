import { useHttp, type HttpForm, type HttpPrecognitiveForm } from '@engblock/inertia-solid'

type Data = { profile: { name: string }; active: boolean }
type Response = { id: number }

const form: HttpForm<Data, Response> = useHttp<Data, Response>({
  profile: { name: '' },
  active: true,
})
const response: Promise<Response> = form.post('/users')
form.setData('profile.name', 'Ada')
form.submit({ method: 'patch', url: '/users/1' })

const precognitive: HttpPrecognitiveForm<Data, Response> = useHttp<Data, Response>('post', '/users', {
  profile: { name: '' },
  active: true,
})
precognitive.validate('profile.name')

void response

// @ts-expect-error response data remains typed
form.post('/users').then((value) => value.missing)
// @ts-expect-error nested field values use their declared type
form.setData('profile.name', false)
// @ts-expect-error methods are restricted to supported HTTP methods
form.submit('trace', '/users')
