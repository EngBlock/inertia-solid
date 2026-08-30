import { Head } from '@engblock/inertia-solid'

export default function WithoutTitle() {
  return (
    <>
      <Head tags={[{ tag: 'meta', attrs: { name: 'test', content: 'no title provided' } }]} />
      <div>
        <h1>Head without Title Prop</h1>
        <p>Tests that Head works without a title prop</p>
      </div>
    </>
  )
}
