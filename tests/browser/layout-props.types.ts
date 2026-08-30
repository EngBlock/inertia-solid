import { resetLayoutProps, setLayoutProps } from '@engblock/inertia-solid'
import '@inertiajs/core'

declare module '@inertiajs/core' {
  interface InertiaConfig {
    layoutProps: { title: string; showSidebar: boolean }
    namedLayoutProps: {
      app: { title: string; theme: 'light' | 'dark' }
      content: { padding: string }
    }
  }
}

setLayoutProps({ title: 'Dashboard' })
setLayoutProps('app', { theme: 'dark' })
setLayoutProps<{ custom: number }>({ custom: 1 })
setLayoutProps<{ custom: number }>('custom', { custom: 1 })
resetLayoutProps()

// @ts-expect-error named layout values use their declared shape
setLayoutProps('app', { padding: 'xl' })
// @ts-expect-error shared layout values use their declared shape
setLayoutProps({ title: 42 })
