import { Link } from '@engblock/inertia-solid'
import AppLayout from '../../layouts/AppLayout'
import ContentLayout from '../../layouts/ContentLayout'

export default function PersistentA() {
  return (
    <>
      <h2>Persistent Page A</h2>
      <Link href="/layout-props/persistent-b">Go to Page B</Link>
    </>
  )
}

PersistentA.layout = {
  app: [AppLayout, { title: 'Persistent Page A' }],
  content: [ContentLayout, { padding: 'lg' }],
}
