import type { Page } from '@inertiajs/core'
import type { Accessor } from 'solid-js'

export function createPageFacade(read: Accessor<Page>): Page {
  const props = createPropsFacade(read)

  return new Proxy({} as Page, {
    get(_target, property) {
      return property === 'props' ? props : Reflect.get(read(), property)
    },
    has(_target, property) {
      return Reflect.has(read(), property)
    },
    ownKeys() {
      return Reflect.ownKeys(read())
    },
    getOwnPropertyDescriptor(_target, property) {
      const descriptor = Reflect.getOwnPropertyDescriptor(read(), property)
      return descriptor ? { ...descriptor, configurable: true } : undefined
    },
    set() {
      throw new TypeError('The Inertia page is read-only')
    },
    deleteProperty() {
      throw new TypeError('The Inertia page is read-only')
    },
  })
}

export function createPropsFacade(read: Accessor<Page>): Page['props'] {
  return new Proxy({}, {
    get(_target, property) {
      return Reflect.get(read().props, property)
    },
    has(_target, property) {
      return Reflect.has(read().props, property)
    },
    ownKeys() {
      return Reflect.ownKeys(read().props)
    },
    getOwnPropertyDescriptor(_target, property) {
      const descriptor = Reflect.getOwnPropertyDescriptor(read().props, property)
      return descriptor ? { ...descriptor, configurable: true } : undefined
    },
    set() {
      throw new TypeError('Inertia page props are read-only')
    },
  }) as Page['props']
}
