import { Head, Link } from '@engblock/inertia-solid'
import { router } from '@inertiajs/core'

export default function TitleCallback(props: { titleSuffix?: string }) {
  return (
    <>
      <Head title="Callback Page" />
      <h1>Title Callback Page</h1>
      <Link href="/head/reactive">Go to reactive</Link>
      <button onClick={() => router.replaceProp('titleSuffix', 'replaced')}>Replace prop</button>
      <p>Current suffix: {props.titleSuffix ?? 'none'}</p>
    </>
  )
}
