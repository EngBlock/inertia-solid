import { Link } from '@engblock/inertia-solid'
import AppLayout from '../../layouts/AppLayout'
import ContentLayout from '../../layouts/ContentLayout'

export default function PersistentB() {
  return <><h2>Persistent Page B</h2><Link href="/layout-props/persistent-a">Go to Page A</Link></>
}

PersistentB.layout = {
  app: [AppLayout, { title: 'Persistent Page B' }],
  content: [ContentLayout, { padding: 'xl' }],
}
