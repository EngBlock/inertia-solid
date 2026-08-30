import { Link } from '@engblock/inertia-solid'
import AlternateContentLayout from '../../layouts/AlternateContentLayout'
import AppLayout from '../../layouts/AppLayout'

export default function SuffixB() {
  return (
    <>
      <h2>Suffix Page B</h2>
      <Link href="/layout-props/suffix-a">Restore nested layout</Link>
    </>
  )
}

SuffixB.layout = [AppLayout, AlternateContentLayout]
