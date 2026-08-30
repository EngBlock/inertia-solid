import { Head, Link, usePage } from '@engblock/inertia-solid'
import { router } from '@inertiajs/core'

export default function ServerHead(props: { foo?: string; next?: string }) {
  const page = usePage()
  const override = () => new URL(page.url, 'http://localhost').searchParams.has('override')

  return (
    <div>
      {override() && (
        <Head
          tags={[
            {
              tag: 'meta',
              headKey: 'description',
              attrs: { name: 'description', content: 'Page override' },
            },
          ]}
        />
      )}
      <h1>Server Head</h1>
      <p id="foo">{props.foo}</p>
      <button onClick={() => router.reload({ only: ['foo'] })}>Reload foo</button>
      <button
        onClick={() =>
          router.replaceProp('head', [
            '<title data-inertia="title">Replaced Head</title>',
            '<meta data-inertia="description" name="description" content="Replaced description">',
          ])
        }
      >
        Replace head client-side
      </button>
      <Link href={props.next ?? '/server-head'}>Next server head page</Link>
    </div>
  )
}
