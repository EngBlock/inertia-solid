import { Head } from '@engblock/inertia-solid'

export default function HeadPage() {
  return (
    <>
      <Head
        title="Test Head Component"
        tags={[
          { tag: 'meta', attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1' } },
          { tag: 'meta', attrs: { name: 'description', content: 'This is an "escape" example' } },
          { tag: 'meta', attrs: { name: 'undefined', content: undefined } },
          { tag: 'meta', attrs: { name: 'number', content: 0 } },
          { tag: 'meta', attrs: { name: 'boolean', content: true } },
          { tag: 'meta', attrs: { name: 'false', content: false } },
          { tag: 'meta', attrs: { name: 'null', content: null } },
          { tag: 'meta', attrs: { name: 'float', content: 3.14 } },
          { tag: 'meta', attrs: { name: 'xss', content: "<script>alert('xss')</script>" } },
          { tag: 'meta', attrs: { name: 'ampersand', content: 'Laravel & Inertia' } },
          { tag: 'meta', attrs: { name: 'unicode', content: 'Hélló! 🎉' } },
        ]}
      />
      <h1 style={{ 'font-size': '40px' }}>Head Component</h1>
    </>
  )
}
