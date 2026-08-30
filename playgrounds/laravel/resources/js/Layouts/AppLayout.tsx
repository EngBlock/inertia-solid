import { Link, usePage } from '@engblock/inertia-solid'
import type { ParentProps } from 'solid-js'

type AppLayoutProps = ParentProps<{
  accent?: string
}>

export default function AppLayout(props: AppLayoutProps) {
  const page = usePage()
  const isActive = (path: string) => page.url === path

  return (
    <div class="shell" data-layout-accent={props.accent ?? 'default'}>
      <header class="site-header">
        <Link href="/" class="brand">
          inertia-solid
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/" class={isActive('/') ? 'active' : undefined}>
            Home
          </Link>
          <Link href="/workflows" class={isActive('/workflows') ? 'active' : undefined}>
            Workflows
          </Link>
          <Link href="/about" prefetch="hover" class={isActive('/about') ? 'active' : undefined}>
            About
          </Link>
        </nav>
        <small>Layout accent: {props.accent ?? 'default'}</small>
      </header>
      {props.children}
    </div>
  )
}
