import { WhenVisible } from '@engblock/inertia-solid'
import { createSignal, Show } from 'solid-js'

export default function WhenVisiblePage(props: { foo?: string; count?: number; delayed?: string }) {
  const [count, setCount] = createSignal(props.count ?? 0)
  const [param, setParam] = createSignal('initial')
  const [mounted, setMounted] = createSignal(true)

  return (
    <>
      <button type="button" onClick={() => setParam('updated')}>
        Update Param
      </button>
      <button type="button" onClick={() => setMounted((value) => !value)}>
        Toggle delayed
      </button>
      <p>Current param: {param()}</p>

      <div style={{ 'margin-top': '3000px' }}>
        <WhenVisible data="foo" fallback={<div>Loading first one...</div>}>
          <div>First one is visible: {props.foo}</div>
        </WhenVisible>
      </div>

      <div style={{ 'margin-top': '5000px' }}>
        <WhenVisible buffer={1000} data="foo" fallback={() => <div>Loading second one...</div>}>
          <div>Second one is visible!</div>
        </WhenVisible>
      </div>

      <div style={{ 'margin-top': '5000px' }}>
        <WhenVisible
          always
          params={{ data: { count: count(), param: param() }, onSuccess: () => setCount((value) => value + 1) }}
          fallback={<div>Loading count...</div>}
        >
          {({ fetching }) => (
            <>
              <div>Count is now {count()}</div>
              <Show when={fetching()}>
                <div>Fetching in background...</div>
              </Show>
            </>
          )}
        </WhenVisible>
      </div>

      <div style={{ 'margin-top': '4000px' }}>
        <Show when={mounted()}>
          <WhenVisible data="delayed" fallback={<div>Loading delayed...</div>}>
            <div>Delayed: {props.delayed}</div>
          </WhenVisible>
        </Show>
      </div>
    </>
  )
}
