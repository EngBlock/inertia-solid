import { Head, Link, usePage } from '@engblock/inertia-solid'

export default function Home() {
  const page = usePage<{ message: string }>()

  return (
    <main>
      <Head title="Home" />
      <h1>Home page</h1>
      <p data-testid="message">{page.props.message}</p>
      <Link href="/about">Visit about</Link>
      <Link id="navigate-back" href="/head/mixed">
        Back to Mixed
      </Link>
    </main>
  )
}
