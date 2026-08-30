import { Link, usePage } from '@engblock/inertia-solid'

export default function About() {
  const page = usePage<{ message: string }>()

  return (
    <main>
      <h1>About page</h1>
      <p data-testid="message">{page.props.message}</p>
      <Link href="/">Return home</Link>
    </main>
  )
}
