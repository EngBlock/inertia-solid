import { Link, usePage } from '@engblock/inertia-solid'
import type { ParentProps } from 'solid-js'

export default function AppLayout(props: ParentProps) {
  const page = usePage()

  const isActive = (path: string) => page.url === path

  return (
    <div class="shell">
      <header class="site-header">
        <Link href="/" class="brand">
          inertia-solid
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/" class={isActive('/') ? 'active' : undefined}>
            Home
          </Link>
          <Link href="/about" prefetch="hover" class={isActive('/about') ? 'active' : undefined}>
            About
          </Link>
        </nav>
      </header>
      {props.children}
    </div>
  )
}
