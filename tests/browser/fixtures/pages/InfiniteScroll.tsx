import {
  InfiniteScroll,
  Link,
  type InfiniteScrollActionSlotProps,
  type InfiniteScrollRef,
  type InfiniteScrollSlotProps,
} from '@engblock/inertia-solid'
import { For, Show, createMemo, createSignal } from 'solid-js'

interface User {
  id: number
  name: string
}

interface Props {
  users: { data: User[] }
  mode:
    | 'automatic'
    | 'custom'
    | 'history'
    | 'manual'
    | 'manual-after'
    | 'preserve-url'
    | 'reverse'
    | 'reverse-manual'
    | 'reverse-manual-after'
    | 'trigger-both'
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
  const reverse = () => props.mode.startsWith('reverse')
  const manual = () => ['history', 'manual', 'reverse-manual'].includes(props.mode)
  const manualAfter = () => (props.mode.endsWith('manual-after') ? 1 : 0)
  const preserveUrl = () => props.mode === 'preserve-url'
  const forwardOnly = () => ['automatic', 'manual-after', 'preserve-url'].includes(props.mode)
  const displayedUsers = createMemo(() => (reverse() ? [...props.users.data].reverse() : props.users.data))

  const previous = (state: InfiniteScrollActionSlotProps) => (
    <div data-testid="previous-state">
      <span>Previous loading: {state.loading ? 'yes' : 'no'}</span>
      <span>Has previous: {state.hasMore ? 'yes' : 'no'}</span>
      <span>Previous action is manual: {state.manualMode ? 'yes' : 'no'}</span>
      <Show when={state.manualMode && state.hasMore}>
        <button disabled={state.loading} onClick={state.fetch}>
          Load previous
        </button>
      </Show>
    </div>
  )

  const next = (state: InfiniteScrollActionSlotProps) => (
    <div data-testid="next-state">
      <span>Next loading: {state.loading ? 'yes' : 'no'}</span>
      <span>Has next: {state.hasMore ? 'yes' : 'no'}</span>
      <span>Manual mode: {state.manualMode ? 'yes' : 'no'}</span>
      <span>Items loading: {state.loadingPrevious || state.loadingNext ? 'yes' : 'no'}</span>
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

  const content = (_state: InfiniteScrollSlotProps) => <Users users={displayedUsers()} />

  const scroll = () => (
    <InfiniteScroll
      data="users"
      as="main"
      class="infinite-items"
      onlyNext={forwardOnly()}
      manual={manual()}
      manualAfter={manualAfter()}
      preserveUrl={preserveUrl()}
      reverse={reverse()}
      previous={previous}
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
                <For each={props.users.data}>{(user) => <li style={{ height: '120px' }}>{user.name}</li>}</For>
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
      <Link href="/about" style={{ position: 'fixed', top: '0', right: '0', 'z-index': 1 }}>
        Leave timeline
      </Link>
      <button onClick={() => api?.fetchNext()}>Programmatic next</button>
      <button onClick={() => setMounted((value) => !value)}>Toggle scroll</button>
      <Show when={mounted()}>{scroll()}</Show>
    </>
  )
}
