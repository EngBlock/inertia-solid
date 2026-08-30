import { Head, Link } from '@engblock/inertia-solid'

export default function Mixed() {
  return (
    <>
      <Head
        title="Multiple Elements Test"
        tags={[
          { tag: 'meta', attrs: { charset: 'utf-8' } },
          { tag: 'meta', attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1' } },
          { tag: 'meta', attrs: { name: 'description', content: 'Testing multiple head elements' } },
          { tag: 'meta', attrs: { name: 'keywords', content: 'test, vue, inertia' } },
          { tag: 'meta', attrs: { property: 'og:title', content: 'Open Graph Title' } },
          { tag: 'meta', attrs: { property: 'og:description', content: 'Open Graph Description' } },
          { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico' } },
          { tag: 'link', attrs: { rel: 'stylesheet', href: '/custom.css' } },
          { tag: 'link', attrs: { rel: 'canonical', href: 'https://example.com/page' } },
        ]}
      />
      <div>
        <h1>Multiple Head Elements</h1>
        <p>Check the document head for multiple elements</p>
        <Link id="navigate-away" href="/">
          Go Home
        </Link>
        <Link id="navigate-back" href="/head/mixed">
          Back to Mixed
        </Link>
      </div>
    </>
  )
}
