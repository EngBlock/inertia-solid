import { router } from '@inertiajs/core'
import { createEffect, createSignal, type Accessor } from 'solid-js'

export type RememberSetter<State> = (value: State | ((previous: State) => State)) => State

export default function useRemember<State>(
  initialState: State,
  key?: string,
  excludeKeys?: Accessor<readonly string[]>,
): [Accessor<State>, RememberSetter<State>] {
  const restored = router.restore(key) as State | undefined
  const [stateBox, setStateBox] = createSignal<{ value: State }>({
    value: restored !== undefined ? restored : initialState,
  })
  const state = () => stateBox().value
  const setState: RememberSetter<State> = (next) => {
    const previous = state()
    const value = typeof next === 'function' ? (next as (previous: State) => State)(previous) : next
    setStateBox({ value })
    return value
  }

  createEffect(
    state,
    (value) => {
      const keys = excludeKeys?.() ?? []

      if (keys.length > 0 && typeof value === 'object' && value !== null) {
        const filtered = { ...value } as Record<string, unknown>
        keys.forEach((field) => delete filtered[field])
        router.remember(filtered, key)
      } else {
        router.remember(value, key)
      }
    },
  )

  return [state, setState]
}
