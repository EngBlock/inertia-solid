import { createLayoutPropsStore, type LayoutProps, type NamedLayoutProps } from '@inertiajs/core'
import type { Setter } from 'solid-js'

export type LayoutPropsSnapshot = {
  shared: Record<string, unknown>
  named: Record<string, Record<string, unknown>>
}

export type LayoutPropsRuntime = {
  set(props: Record<string, unknown>): void
  setFor(name: string, props: Record<string, unknown>): void
  reset(): void
}

let activeRuntime: LayoutPropsRuntime | undefined

export function createLayoutPropsRuntime(setSnapshot: Setter<LayoutPropsSnapshot>): LayoutPropsRuntime {
  const store = createLayoutPropsStore()
  const publish = () => setSnapshot(store.get())

  return {
    set(props) {
      store.set(props)
      publish()
    },
    setFor(name, props) {
      store.setFor(name, props)
      publish()
    },
    reset() {
      store.reset()
      publish()
    },
  }
}

export function bindLayoutPropsRuntime(runtime: LayoutPropsRuntime): () => void {
  activeRuntime = runtime

  return () => {
    if (activeRuntime === runtime) activeRuntime = undefined
  }
}

export function setLayoutProps(props: Partial<LayoutProps>): void
export function setLayoutProps<K extends keyof NamedLayoutProps>(name: K, props: Partial<NamedLayoutProps[K]>): void
export function setLayoutProps<T = never>(props: Partial<NoInfer<T>>): void
export function setLayoutProps<T = never>(name: string, props: Partial<NoInfer<T>>): void
export function setLayoutProps(nameOrProps: string | Record<string, unknown>, props?: Record<string, unknown>): void {
  if (typeof nameOrProps === 'string') {
    activeRuntime?.setFor(nameOrProps, props ?? {})
  } else {
    activeRuntime?.set(nameOrProps)
  }
}

export function resetLayoutProps(): void {
  activeRuntime?.reset()
}
