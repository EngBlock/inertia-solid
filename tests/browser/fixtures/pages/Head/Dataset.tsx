import { Head } from '@engblock/inertia-solid'

export default function Dataset() {
  return (
    <>
      <Head
        title="Test Head Component"
        tags={[{ tag: 'meta', attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1' } }]}
      />
      <h1 style={{ 'font-size': '40px' }}>Head Component</h1>
    </>
  )
}
