import { Head } from '@engblock/inertia-solid'

export default function WithTitle() {
  return (
    <>
      <Head
        tags={[
          { tag: 'title', children: 'Title from Children' },
          { tag: 'meta', attrs: { name: 'description', content: 'Title set via children, not prop' } },
        ]}
      />
      <div>
        <h1>Title in Children</h1>
        <p>Tests title element as a child instead of using title prop</p>
      </div>
    </>
  )
}
