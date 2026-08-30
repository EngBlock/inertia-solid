import { Head, Link, router } from '@engblock/inertia-solid'
import { For, Show, createMemo, createSignal } from 'solid-js'
import BoardColumn from '../../Components/BoardColumn'
import CardModal from '../../Components/CardModal'
import Icon from '../../Components/Icon'
import useLocalBoard from '../../lib/useLocalBoard'
import type { Background, Board, Card, CurrentUser } from '../../types/board'

type ShowProps = {
  board: Board
  currentUser: CurrentUser
}

const backgrounds: Background[] = ['ocean', 'violet', 'forest', 'sunset', 'slate']

const syncCopy = {
  saved: 'All changes saved',
  pending: 'Saving changes…',
  syncing: 'Syncing…',
  offline: 'Offline · saved on device',
  error: 'Sync paused · retry',
} as const

export default function BoardShow(props: ShowProps) {
  const local = useLocalBoard(props.board)
  const [query, setQuery] = createSignal('')
  const [selectedCard, setSelectedCard] = createSignal<string>()
  const [filtersOpen, setFiltersOpen] = createSignal(false)
  const [menuOpen, setMenuOpen] = createSignal(false)
  const [activityOpen, setActivityOpen] = createSignal(false)
  const [addingList, setAddingList] = createSignal(false)
  const [listTitle, setListTitle] = createSignal('')
  const [labelFilters, setLabelFilters] = createSignal<string[]>([])
  const [memberFilters, setMemberFilters] = createSignal<number[]>([])
  const [dueFilter, setDueFilter] = createSignal<'all' | 'due' | 'complete'>('all')
  let draggedCard: { cardId: string; listId: string } | undefined
  let draggedList: string | undefined

  const activeFilterCount = createMemo(
    () => labelFilters().length + memberFilters().length + (dueFilter() === 'all' ? 0 : 1),
  )

  const matches = (card: Card) => {
    const search = query().trim().toLowerCase()
    if (search && !`${card.title} ${card.description}`.toLowerCase().includes(search)) return false
    if (labelFilters().length && !labelFilters().some((id) => card.label_ids.includes(id))) return false
    if (memberFilters().length && !memberFilters().some((id) => card.member_ids.includes(id))) return false
    if (dueFilter() === 'due' && !card.due_at) return false
    if (dueFilter() === 'complete' && !card.completed) return false
    return true
  }

  const dragCard = (event: DragEvent, card: Card, listId: string) => {
    event.stopPropagation()
    draggedCard = { cardId: card.id, listId }
    draggedList = undefined
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', card.id)
    }
  }

  const dropCard = (event: DragEvent, targetListId: string, targetPosition: number) => {
    event.preventDefault()
    event.stopPropagation()
    const moving = draggedCard
    if (!moving) return
    const title = local.board.lists.flatMap((list) => list.cards).find((card) => card.id === moving.cardId)?.title

    local.mutate(`moved “${title ?? 'a card'}”`, (board) => {
      const source = board.lists.find((list) => list.id === moving.listId)
      const target = board.lists.find((list) => list.id === targetListId)
      if (!source || !target) return
      const sourcePosition = source.cards.findIndex((card) => card.id === moving.cardId)
      if (sourcePosition < 0) return
      const [card] = source.cards.splice(sourcePosition, 1)
      const adjusted = source === target && sourcePosition < targetPosition ? targetPosition - 1 : targetPosition
      target.cards.splice(Math.max(0, Math.min(adjusted, target.cards.length)), 0, card)
    })
    draggedCard = undefined
  }

  const dragList = (event: DragEvent, listId: string) => {
    if (draggedCard) return
    draggedList = listId
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', listId)
    }
  }

  const dropList = (event: DragEvent, targetListId: string) => {
    event.preventDefault()
    event.stopPropagation()
    if (!draggedList || draggedCard || draggedList === targetListId) return
    const sourceId = draggedList
    local.mutate('reordered lists', (board) => {
      const sourcePosition = board.lists.findIndex((list) => list.id === sourceId)
      const targetPosition = board.lists.findIndex((list) => list.id === targetListId)
      if (sourcePosition < 0 || targetPosition < 0) return
      const [list] = board.lists.splice(sourcePosition, 1)
      board.lists.splice(targetPosition, 0, list)
    })
    draggedList = undefined
  }

  const addList = (event: SubmitEvent) => {
    event.preventDefault()
    const title = listTitle().trim()
    if (!title) return
    setListTitle('')
    setAddingList(false)
    local.mutate(`added the “${title}” list`, (board) => {
      board.lists.push({ id: crypto.randomUUID(), title, position: board.lists.length, cards: [] })
    })
  }

  const toggleLabelFilter = (id: string) => {
    setLabelFilters((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))
  }

  const toggleMemberFilter = (id: number) => {
    setMemberFilters((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))
  }

  const clearFilters = () => {
    setLabelFilters([])
    setMemberFilters([])
    setDueFilter('all')
    setQuery('')
  }

  const deleteBoard = () => {
    if (window.confirm(`Delete “${local.board.title}”? This cannot be undone.`)) {
      localStorage.removeItem(`trellis:board:${local.board.id}`)
      router.delete(`/boards/${local.board.id}`)
    }
  }

  return (
    <div class={`board-page background-${local.board.background}`}>
      <Head title={local.board.title} />
      <header class="board-app-header">
        <Link href="/" class="logo light" aria-label="Back to all boards">
          <span class="logo-mark">
            <i />
            <i />
            <i />
          </span>
          <span>Trellis</span>
        </Link>
        <nav aria-label="Board breadcrumb">
          <Link href="/">Trellis Studio</Link>
          <span>/</span>
          <strong>{local.board.title}</strong>
        </nav>
        <div class="board-header-search">
          <Icon name="search" size={16} />
          <input
            value={query()}
            onInput={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search this board"
            aria-label="Search this board"
          />
        </div>
        <button type="button" class={`sync-status status-${local.status()}`} onClick={() => void local.syncNow()}>
          <i /> {syncCopy[local.status()]}
        </button>
        <span class="avatar avatar-teal" title={props.currentUser.name}>
          {props.currentUser.name
            .split(' ')
            .map((part) => part[0])
            .slice(0, 2)
            .join('')}
        </span>
      </header>

      <div class="board-toolbar">
        <div class="board-name">
          <input
            value={local.board.title}
            aria-label="Board title"
            onChange={(event) => {
              const title = event.currentTarget.value.trim()
              if (title) local.mutate(`renamed the board to “${title}”`, (board) => (board.title = title))
            }}
          />
          <button
            type="button"
            class={local.board.starred ? 'starred' : ''}
            aria-label={local.board.starred ? 'Unstar board' : 'Star board'}
            onClick={() =>
              local.mutate(
                local.board.starred ? 'unstarred this board' : 'starred this board',
                (board) => (board.starred = !board.starred),
              )
            }
          >
            <Icon name="star" filled={local.board.starred} />
          </button>
          <span class="board-visibility">Workspace</span>
        </div>
        <div class="board-tools">
          <div class="member-stack">
            <For each={local.board.members.slice(0, 4)}>
              {(member) => (
                <span class={`avatar avatar-${member.color}`} title={member.name}>
                  {member.initials}
                </span>
              )}
            </For>
            <Show when={local.board.members.length > 4}>
              <span class="avatar avatar-more">+{local.board.members.length - 4}</span>
            </Show>
          </div>
          <button type="button" onClick={() => setFiltersOpen(!filtersOpen())}>
            <Icon name="filter" size={16} /> Filter{' '}
            <Show when={activeFilterCount()}>
              <b>{activeFilterCount()}</b>
            </Show>
          </button>
          <button type="button" onClick={() => setActivityOpen(!activityOpen())}>
            <Icon name="activity" size={16} /> Activity
          </button>
          <button type="button" onClick={() => setMenuOpen(!menuOpen())}>
            <Icon name="menu" size={17} /> Menu
          </button>
        </div>

        <Show when={filtersOpen()}>
          <aside class="toolbar-popover filter-popover">
            <div class="popover-heading">
              <h3>Filter cards</h3>
              <button type="button" onClick={() => setFiltersOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <label>Due date</label>
            <button type="button" class={dueFilter() === 'all' ? 'selected' : ''} onClick={() => setDueFilter('all')}>
              <span class="filter-radio" /> Any date
            </button>
            <button type="button" class={dueFilter() === 'due' ? 'selected' : ''} onClick={() => setDueFilter('due')}>
              <Icon name="clock" /> Has a due date
            </button>
            <button
              type="button"
              class={dueFilter() === 'complete' ? 'selected' : ''}
              onClick={() => setDueFilter('complete')}
            >
              <Icon name="check" /> Marked complete
            </button>
            <label>Labels</label>
            <For each={local.board.labels}>
              {(label) => (
                <button
                  type="button"
                  class={labelFilters().includes(label.id) ? 'selected' : ''}
                  onClick={() => toggleLabelFilter(label.id)}
                >
                  <i class={`label-${label.color}`} />
                  {label.name}
                  <Icon name="check" size={14} />
                </button>
              )}
            </For>
            <label>Members</label>
            <For each={local.board.members}>
              {(member) => (
                <button
                  type="button"
                  class={memberFilters().includes(member.id) ? 'selected' : ''}
                  onClick={() => toggleMemberFilter(member.id)}
                >
                  <span class={`avatar avatar-${member.color}`}>{member.initials}</span>
                  {member.name}
                  <Icon name="check" size={14} />
                </button>
              )}
            </For>
            <button type="button" class="clear-filter" onClick={clearFilters}>
              Clear all filters
            </button>
          </aside>
        </Show>

        <Show when={menuOpen()}>
          <aside class="toolbar-popover board-menu-popover">
            <div class="popover-heading">
              <h3>Board menu</h3>
              <button type="button" onClick={() => setMenuOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <label>About this board</label>
            <textarea
              value={local.board.description}
              onChange={(event) =>
                local.mutate(
                  'updated the board description',
                  (board) => (board.description = event.currentTarget.value),
                )
              }
              placeholder="Add a board description"
            />
            <label>Change background</label>
            <div class="menu-backgrounds">
              <For each={backgrounds}>
                {(background) => (
                  <button
                    type="button"
                    class={`background-${background} ${local.board.background === background ? 'selected' : ''}`}
                    onClick={() =>
                      local.mutate('changed the board background', (board) => (board.background = background))
                    }
                  >
                    <Icon name="check" />
                  </button>
                )}
              </For>
            </div>
            <button type="button" class="menu-danger" onClick={deleteBoard}>
              <Icon name="trash" /> Delete board
            </button>
          </aside>
        </Show>
      </div>

      <main class="board-canvas" aria-label={`${local.board.title} lists`}>
        <div class="board-columns">
          <For each={local.board.lists}>
            {(list) => (
              <BoardColumn
                board={local.board}
                list={list}
                mutate={local.mutate}
                matches={matches}
                openCard={setSelectedCard}
                dragCard={dragCard}
                dropCard={dropCard}
                dragList={dragList}
                dropList={dropList}
              />
            )}
          </For>
          <Show
            when={addingList()}
            fallback={
              <button type="button" class="add-list-button" onClick={() => setAddingList(true)}>
                <Icon name="plus" /> Add another list
              </button>
            }
          >
            <form class="add-list-form" onSubmit={addList}>
              <input
                autofocus
                value={listTitle()}
                onInput={(event) => setListTitle(event.currentTarget.value)}
                placeholder="Enter list title…"
                aria-label="New list title"
              />
              <div>
                <button class="primary-button compact" disabled={!listTitle().trim()}>
                  Add list
                </button>
                <button type="button" class="icon-button" aria-label="Cancel" onClick={() => setAddingList(false)}>
                  <Icon name="close" />
                </button>
              </div>
            </form>
          </Show>
        </div>
      </main>

      <Show when={activityOpen()}>
        <aside class="activity-drawer">
          <div class="popover-heading">
            <h3>Activity</h3>
            <button type="button" onClick={() => setActivityOpen(false)}>
              <Icon name="close" />
            </button>
          </div>
          <p class="drawer-intro">A record of the latest synced board changes.</p>
          <div class="activity-list">
            <For each={local.board.activity}>
              {(entry) => (
                <article>
                  <span class="avatar avatar-teal">
                    {entry.user.name
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <p>
                    <strong>{entry.user.name}</strong> {entry.action}
                    <time>
                      {new Date(entry.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </time>
                  </p>
                </article>
              )}
            </For>
          </div>
        </aside>
      </Show>

      <Show when={selectedCard()}>
        {(id) => (
          <CardModal
            board={local.board}
            cardId={id()}
            currentUser={props.currentUser}
            mutate={local.mutate}
            onClose={() => setSelectedCard()}
          />
        )}
      </Show>
    </div>
  )
}
