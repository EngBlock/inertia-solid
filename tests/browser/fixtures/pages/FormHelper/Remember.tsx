import { Link, useForm } from '@engblock/inertia-solid'

export default function Remember() {
  const form = useForm('profile', { name: '', password: '' }).dontRemember('password')

  return (
    <>
      <label>
        Name
        <input value={form.data.name} onInput={(event) => form.setData('name', event.currentTarget.value)} />
      </label>
      <label>
        Password
        <input
          type="password"
          value={form.data.password}
          onInput={(event) => form.setData('password', event.currentTarget.value)}
        />
      </label>
      <Link href="/about">Leave form</Link>
    </>
  )
}
