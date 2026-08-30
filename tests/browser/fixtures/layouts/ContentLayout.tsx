import { createUniqueId, onCleanup, type Element } from 'solid-js'

type Props = {
  padding?: string
  maxWidth?: string
  children?: Element
}

export default function ContentLayout(props: Props) {
  const id = createUniqueId()

  if (typeof window !== 'undefined') {
    window._inertia_content_layout_id = id
    window._inertia_content_layout_mounts = (window._inertia_content_layout_mounts ?? 0) + 1
    onCleanup(() => {
      window._inertia_content_layout_disposals = (window._inertia_content_layout_disposals ?? 0) + 1
    })
  }

  return (
    <section class="content-layout" data-padding={props.padding ?? 'md'} data-max-width={props.maxWidth ?? 'lg'}>
      {props.children}
    </section>
  )
}
