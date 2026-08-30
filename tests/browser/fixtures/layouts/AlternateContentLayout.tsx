import { onCleanup, type Element } from 'solid-js'

export default function AlternateContentLayout(props: { children?: Element }) {
  if (typeof window !== 'undefined') {
    window._inertia_alternate_layout_mounts = (window._inertia_alternate_layout_mounts ?? 0) + 1
    onCleanup(() => {
      window._inertia_alternate_layout_disposals = (window._inertia_alternate_layout_disposals ?? 0) + 1
    })
  }

  return <section class="alternate-content-layout">{props.children}</section>
}
