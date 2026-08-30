import { useForm } from '@engblock/inertia-solid'

type FormData = {
  name: string
  company: { name: string; address: { city: string } }
  users: { name: string }[]
}

export default function Data() {
  const form = useForm<FormData>({
    name: '',
    company: { name: '', address: { city: '' } },
    users: [{ name: '' }],
  })

  form.setData('name', 'Ada')
  form.setData('company.name', 'Analytical Engines')
  form.setData('company.address.city', 'London')
  form.setData('users.0.name', 'Grace')
  form.setDefaults('company.name', 'Engines')
  form.reset('company.address.city', 'users.0.name')

  const name: string = form.data.company.name
  void name

  // @ts-expect-error unknown nested field
  form.setData('company.email', 'ada@example.com')
  // @ts-expect-error nested value must match its field
  form.setData('company.address.city', false)
  // @ts-expect-error reset only accepts form field paths
  form.reset('missing')

  return null
}
