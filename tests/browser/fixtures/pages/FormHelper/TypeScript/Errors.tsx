import { useForm } from '@engblock/inertia-solid'

export default function Errors() {
  const form = useForm({
    company: { name: '', address: { city: '' } },
    users: [{ name: '' }],
  })

  form.setError('company.name', 'The company name is required.')
  form.setError({ 'company.address.city': 'The city is required.' })
  form.clearErrors('company.name', 'users.0.name')
  form.resetAndClearErrors('company.address.city')

  const cityError: string | undefined = form.errors['company.address.city']
  void cityError

  // @ts-expect-error unknown nested error path
  form.setError('company.email', 'Invalid email')
  // @ts-expect-error unknown array item error path
  form.setError('users.0.email', 'Invalid email')

  return null
}
