import {
  InfiniteScroll,
  type InfiniteScrollActionSlotProps,
  type InfiniteScrollRef,
  type InfiniteScrollSlotProps,
} from '@engblock/inertia-solid'
import { For, Show, createSignal } from 'solid-js'

interface User {
  id: number
  name: string
}

interface Props {
  users: { data: User[] }
  mode: 'automatic' | 'custom' | 'manual' | 'manual-after' | 'preserve-url'
}

const Users = (props: { users: User[] }) => (
  <For each={props.users}>
    {(user) => (
      <div data-user-id={user.id} style={{ height: '120px', border: '1px solid #ddd' }}>
        {user.name}
      </div>
    )}
  </For>
)

export default function InfiniteScrollFixture(props: Props) {
  let api: InfiniteScrollRef | undefined
  const [mounted, setMounted] = createSignal(true)
  const manual = () => props.mode === 'manual'
  const manualAfter = () => (props.mode === 'manual-after' ? 1 : 0)
  const preserveUrl = () => props.mode === 'preserve-url'

  const next = (state: InfiniteScrollActionSlotProps) => (
    <div data-testid="next-state">
      <span>Next loading: {state.loading ? 'yes' : 'no'}</span>
      <span>Has next: {state.hasMore ? 'yes' : 'no'}</span>
      <span>Manual mode: {state.manualMode ? 'yes' : 'no'}</span>
      <Show when={state.manualMode && state.hasMore}>
        <button disabled={state.loading} onClick={state.fetch}>
          Load next
        </button>
      </Show>
    </div>
  )

  const loading = (state: InfiniteScrollActionSlotProps) => (
    <span>{state.loadingNext ? 'Loading more users...' : 'Loading users...'}</span>
  )

  const content = (state: InfiniteScrollSlotProps) => (
    <>
      <span>Items loading: {state.loading ? 'yes' : 'no'}</span>
      <Users users={props.users.data} />
    </>
  )

  const scroll = () => (
    <InfiniteScroll
      data="users"
      as="main"
      class="infinite-items"
      onlyNext
      manual={manual()}
      manualAfter={manualAfter()}
      preserveUrl={preserveUrl()}
      next={next}
      loading={loading}
      ref={(value) => (api = value)}
    >
      {content}
    </InfiniteScroll>
  )

  if (props.mode === 'custom') {
    return (
      <div data-testid="scroll-container" style={{ height: '420px', overflow: 'auto' }}>
        <InfiniteScroll
          data="users"
          as="section"
          class="custom-wrapper"
          onlyNext
          itemsElement="#custom-items"
          endElement="#custom-end"
          loading={loading}
        >
          {(state) => (
            <>
              <ul id="custom-items" data-loading={state.loadingNext}>
                <For each={props.users.data}>
                  {(user) => <li style={{ height: '120px' }}>{user.name}</li>}
                </For>
              </ul>
              <div id="custom-end">Custom end</div>
            </>
          )}
        </InfiniteScroll>
      </div>
    )
  }

  return (
    <>
      <button onClick={() => api?.fetchNext()}>Programmatic next</button>
      <button onClick={() => setMounted((value) => !value)}>Toggle scroll</button>
      <Show when={mounted()}>{scroll()}</Show>
    </>
  )
}
