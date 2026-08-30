import { createSignal, createUniqueId, onCleanup, type Element } from 'solid-js'

type Props = {
  title?: string
  showSidebar?: boolean
  theme?: string
  step?: number
  children?: Element
}

export default function AppLayout(props: Props) {
  const id = createUniqueId()
  const [count, setCount] = createSignal(0)

  if (typeof window !== 'undefined') {
    window._inertia_app_layout_id = id
    window._inertia_app_layout_mounts = (window._inertia_app_layout_mounts ?? 0) + 1
    onCleanup(() => {
      window._inertia_app_layout_disposals = (window._inertia_app_layout_disposals ?? 0) + 1
    })
  }

  return (
    <div class="app-layout" data-theme={props.theme ?? 'light'} data-step={props.step}>
      <h1 class="app-title">{props.title ?? 'Default Title'}</h1>
      <button type="button" onClick={() => setCount(count() + 1)}>Layout count {count()}</button>
      {props.showSidebar !== false && <aside class="sidebar">Sidebar</aside>}
      <main>{props.children}</main>
    </div>
  )
}
