import { InfiniteScroll, type InfiniteScrollActionSlotProps, type InfiniteScrollRef } from '@engblock/inertia-solid'

let api: InfiniteScrollRef | undefined

const fixture = (
  <InfiniteScroll
    data="users"
    as="ul"
    class="users"
    buffer={200}
    manualAfter={2}
    preserveUrl
    onlyNext
    params={{ headers: { 'X-Test': 'infinite-scroll' } }}
    itemsElement="#users"
    ref={(value) => (api = value)}
    next={(state: InfiniteScrollActionSlotProps) => (
      <button disabled={state.loading || !state.hasMore} onClick={state.fetch}>
        Load more
      </button>
    )}
    loading={(state) => <span>{state.loadingNext ? 'Loading' : 'Idle'}</span>}
  >
    {(state) => <li data-loading={state.loadingNext}>User</li>}
  </InfiniteScroll>
)

void fixture
api?.fetchNext()
api?.hasNext()
