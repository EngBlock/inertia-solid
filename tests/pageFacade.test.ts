import type { Page } from '@inertiajs/core'
import { createRoot, createSignal, flush, type Setter } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { createPageFacade, createPropsFacade } from '../src/pageFacade'

const page = (name: string): Page => ({
  component: 'Users',
  url: '/users',
  version: null,
  clearHistory: false,
  encryptHistory: false,
  rescuedProps: [],
  props: { name },
})

describe('page facade', () => {
  it('keeps facade identity while exposing the latest exact snapshot', () => {
    const first = page('Ada')
    const second = page('Grace')
    let setCurrent!: Setter<Page>
    let dispose!: () => void
    let facade!: Page
    let props!: Page['props']

    createRoot((rootDispose) => {
      const [current, set] = createSignal<Page>(first)
      setCurrent = set
      dispose = rootDispose
      facade = createPageFacade(current)
      props = createPropsFacade(current)
    })

    expect(facade.props).not.toBe(first.props)
    expect(facade.props.name).toBe('Ada')
    expect(props.name).toBe('Ada')

    setCurrent(second)
    flush()

    expect(facade.props.name).toBe('Grace')
    expect(props.name).toBe('Grace')
    expect(Object.keys(props)).toEqual(['name'])
    dispose()
  })

  it('is read-only', () => {
    let facade!: Page
    let dispose!: () => void

    createRoot((rootDispose) => {
      const [current] = createSignal<Page>(page('Ada'))
      facade = createPageFacade(current)
      dispose = rootDispose
    })

    expect(() => {
      facade.url = '/elsewhere'
    }).toThrow('read-only')
    expect(() => {
      facade.props.name = 'Grace'
    }).toThrow('read-only')
    dispose()
  })
})
