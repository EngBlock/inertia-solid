import { Link, usePage } from '@engblock/inertia-solid'
import { createSignal, onCleanup } from 'solid-js'
import AppLayout from '../../layouts/AppLayout'

export default function Stateful() {
  const page = usePage<{ step: number }>()
  const [count, setCount] = createSignal(0)

  if (typeof window !== 'undefined') {
    window._inertia_page_mounts = (window._inertia_page_mounts ?? 0) + 1
    onCleanup(() => {
      window._inertia_page_disposals = (window._inertia_page_disposals ?? 0) + 1
    })
  }

  return <>
    <h2>Stateful Page {page.props.step}</h2>
    <button type="button" onClick={() => setCount(count() + 1)}>Page count {count()}</button>
    <Link href="/layout-props/stateful-2" preserveState>Preserve page</Link>
    <Link href="/layout-props/stateful-1" preserveState={false}>Remount page</Link>
  </>
}

Stateful.layout = [AppLayout, { title: 'Stateful Layout' }]
