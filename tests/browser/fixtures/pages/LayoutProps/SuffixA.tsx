import { Link } from '@engblock/inertia-solid'
import AppLayout from '../../layouts/AppLayout'
import ContentLayout from '../../layouts/ContentLayout'

export default function SuffixA() {
  return <><h2>Suffix Page A</h2><Link href="/layout-props/suffix-b">Change nested layout</Link></>
}

SuffixA.layout = [AppLayout, ContentLayout]
