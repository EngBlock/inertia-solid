import { Head, Link, router } from '@engblock/inertia-solid'
import { Checkbox } from '@kobalte/core/checkbox'
import {
  CloseButton as DialogCloseButton,
  Content as DialogContent,
  Description as DialogDescription,
  Portal as DialogPortal,
  Root as DialogRoot,
  Title as DialogTitle,
  Trigger as DialogTrigger,
} from '@kobalte/core/dialog'
import { Popover } from '@kobalte/core/popover'
import { RadioGroup } from '@kobalte/core/radio-group'
import { TextField } from '@kobalte/core/text-field'
import { ToggleButton } from '@kobalte/core/toggle-button'
import { For, Show, createMemo, createSignal } from 'solid-js'
import BoardColumn from '../../Components/BoardColumn'
import CardModal from '../../Components/CardModal'
import ConfirmDialog from '../../Components/ConfirmDialog'
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
    localStorage.removeItem(`trellis:board:${local.board.id}`)
    router.delete(`/boards/${local.board.id}`)
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
        <TextField class="board-header-search" value={query()} onChange={setQuery}>
          <Icon name="search" size={16} />
          <TextField.Input placeholder="Search this board" aria-label="Search this board" />
        </TextField>
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
          <ToggleButton
            class={local.board.starred ? 'starred' : ''}
            pressed={local.board.starred}
            aria-label={local.board.starred ? 'Unstar board' : 'Star board'}
            onChange={() =>
              local.mutate(
                local.board.starred ? 'unstarred this board' : 'starred this board',
                (board) => (board.starred = !board.starred),
              )
            }
          >
            <Icon name="star" filled={local.board.starred} />
          </ToggleButton>
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
          <Popover open={filtersOpen()} onOpenChange={setFiltersOpen} placement="bottom-end" gutter={8}>
            <Popover.Trigger>
              <Icon name="filter" size={16} /> Filter{' '}
              <Show when={activeFilterCount()}>
                <b>{activeFilterCount()}</b>
              </Show>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content class="toolbar-popover filter-popover">
                <div class="popover-heading">
                  <Popover.Title>Filter cards</Popover.Title>
                  <Popover.CloseButton aria-label="Close filters">
                    <Icon name="close" />
                  </Popover.CloseButton>
                </div>
                <RadioGroup
                  class="filter-group"
                  value={dueFilter()}
                  onChange={(value) => setDueFilter(value as 'all' | 'due' | 'complete')}
                >
                  <RadioGroup.Label class="filter-group-label">Due date</RadioGroup.Label>
                  <RadioGroup.Item value="all" class="filter-option">
                    <RadioGroup.ItemInput />
                    <RadioGroup.ItemControl class="filter-radio">
                      <RadioGroup.ItemIndicator />
                    </RadioGroup.ItemControl>
                    <RadioGroup.ItemLabel>Any date</RadioGroup.ItemLabel>
                  </RadioGroup.Item>
                  <RadioGroup.Item value="due" class="filter-option">
                    <RadioGroup.ItemInput />
                    <RadioGroup.ItemControl class="filter-icon">
                      <Icon name="clock" />
                    </RadioGroup.ItemControl>
                    <RadioGroup.ItemLabel>Has a due date</RadioGroup.ItemLabel>
                  </RadioGroup.Item>
                  <RadioGroup.Item value="complete" class="filter-option">
                    <RadioGroup.ItemInput />
                    <RadioGroup.ItemControl class="filter-icon">
                      <Icon name="check" />
                    </RadioGroup.ItemControl>
                    <RadioGroup.ItemLabel>Marked complete</RadioGroup.ItemLabel>
                  </RadioGroup.Item>
                </RadioGroup>
                <span class="filter-group-label">Labels</span>
                <For each={local.board.labels}>
                  {(label) => (
                    <Checkbox
                      class="filter-option"
                      checked={labelFilters().includes(label.id)}
                      onChange={() => toggleLabelFilter(label.id)}
                    >
                      <Checkbox.Input />
                      <i class={`label-${label.color}`} />
                      <Checkbox.Label>{label.name}</Checkbox.Label>
                      <Checkbox.Control class="filter-checkbox">
                        <Checkbox.Indicator>
                          <Icon name="check" size={14} />
                        </Checkbox.Indicator>
                      </Checkbox.Control>
                    </Checkbox>
                  )}
                </For>
                <span class="filter-group-label">Members</span>
                <For each={local.board.members}>
                  {(member) => (
                    <Checkbox
                      class="filter-option"
                      checked={memberFilters().includes(member.id)}
                      onChange={() => toggleMemberFilter(member.id)}
                    >
                      <Checkbox.Input />
                      <span class={`avatar avatar-${member.color}`}>{member.initials}</span>
                      <Checkbox.Label>{member.name}</Checkbox.Label>
                      <Checkbox.Control class="filter-checkbox">
                        <Checkbox.Indicator>
                          <Icon name="check" size={14} />
                        </Checkbox.Indicator>
                      </Checkbox.Control>
                    </Checkbox>
                  )}
                </For>
                <button type="button" class="clear-filter" onClick={clearFilters}>
                  Clear all filters
                </button>
              </Popover.Content>
            </Popover.Portal>
          </Popover>

          <DialogRoot open={activityOpen()} onOpenChange={setActivityOpen} modal={false}>
            <DialogTrigger>
              <Icon name="activity" size={16} /> Activity
            </DialogTrigger>
            <DialogPortal>
              <DialogContent class="activity-drawer">
                <div class="popover-heading">
                  <DialogTitle>Activity</DialogTitle>
                  <DialogCloseButton aria-label="Close activity">
                    <Icon name="close" />
                  </DialogCloseButton>
                </div>
                <DialogDescription class="drawer-intro">A record of the latest synced board changes.</DialogDescription>
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
              </DialogContent>
            </DialogPortal>
          </DialogRoot>

          <Popover open={menuOpen()} onOpenChange={setMenuOpen} placement="bottom-end" gutter={8}>
            <Popover.Trigger>
              <Icon name="menu" size={17} /> Menu
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content class="toolbar-popover board-menu-popover">
                <div class="popover-heading">
                  <Popover.Title>Board menu</Popover.Title>
                  <Popover.CloseButton aria-label="Close board menu">
                    <Icon name="close" />
                  </Popover.CloseButton>
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
                <RadioGroup
                  class="menu-background-group"
                  value={local.board.background}
                  onChange={(value) =>
                    local.mutate('changed the board background', (board) => (board.background = value as Background))
                  }
                >
                  <RadioGroup.Label class="filter-group-label">Change background</RadioGroup.Label>
                  <div class="menu-backgrounds">
                    <For each={backgrounds}>
                      {(background) => (
                        <RadioGroup.Item value={background} class="menu-background-option">
                          <RadioGroup.ItemInput />
                          <RadioGroup.ItemControl class={`background-${background}`}>
                            <RadioGroup.ItemIndicator>
                              <Icon name="check" />
                            </RadioGroup.ItemIndicator>
                          </RadioGroup.ItemControl>
                          <RadioGroup.ItemLabel class="visually-hidden">{background} background</RadioGroup.ItemLabel>
                        </RadioGroup.Item>
                      )}
                    </For>
                  </div>
                </RadioGroup>
                <ConfirmDialog
                  triggerClass="menu-danger"
                  title={`Delete “${local.board.title}”?`}
                  description="This board and all of its cards will be permanently deleted."
                  confirmLabel="Delete board"
                  onConfirm={deleteBoard}
                >
                  <Icon name="trash" /> Delete board
                </ConfirmDialog>
              </Popover.Content>
            </Popover.Portal>
          </Popover>
        </div>
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

      <Show when={selectedCard()}>
        {(id) => (
          <CardModal
            board={local.board}
            cardId={id()}
            currentUser={props.currentUser}
            mutate={local.mutate}
            onClose={() => setSelectedCard(undefined)}
          />
        )}
      </Show>
    </div>
  )
}
