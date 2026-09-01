import { For, Show, createMemo, createSignal } from 'solid-js'
import type { BoardMutation } from '../lib/useLocalBoard'
import type { Board, BoardList, Card } from '../types/board'
import BoardCard from './BoardCard'
import ConfirmDialog from './ConfirmDialog'
import Icon from './Icon'

type BoardColumnProps = {
  board: Board
  list: BoardList
  mutate: BoardMutation
  matches: (card: Card) => boolean
  openCard: (id: string) => void
  dragCard: (event: DragEvent, card: Card, listId: string) => void
  dropCard: (event: DragEvent, listId: string, position: number) => void
  dragList: (event: DragEvent, listId: string) => void
  dropList: (event: DragEvent, listId: string) => void
}

export default function BoardColumn(props: BoardColumnProps) {
  const [adding, setAdding] = createSignal(false)
  const [title, setTitle] = createSignal('')
  const visibleCards = createMemo(() => props.list.cards.filter(props.matches))

  const addCard = (event: SubmitEvent) => {
    event.preventDefault()
    const cardTitle = title().trim()
    if (!cardTitle) return
    setTitle('')
    setAdding(false)
    props.mutate(`added “${cardTitle}” to ${props.list.title}`, (board) => {
      const list = board.lists.find((item) => item.id === props.list.id)
      list?.cards.push({
        id: crypto.randomUUID(),
        list_id: props.list.id,
        title: cardTitle,
        description: '',
        position: list.cards.length,
        due_at: null,
        completed: false,
        cover_color: null,
        label_ids: [],
        member_ids: [],
        checklist: [],
        comments: [],
      })
    })
  }

  const renameList = (value: string) => {
    const nextTitle = value.trim()
    if (!nextTitle || nextTitle === props.list.title) return
    props.mutate(`renamed a list to “${nextTitle}”`, (board) => {
      const list = board.lists.find((item) => item.id === props.list.id)
      if (list) list.title = nextTitle
    })
  }

  const deleteList = () => {
    props.mutate(`deleted the “${props.list.title}” list`, (board) => {
      board.lists = board.lists.filter((item) => item.id !== props.list.id)
    })
  }

  return (
    <section
      class="board-column"
      draggable="true"
      onDragStart={(event) => props.dragList(event, props.list.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => props.dropList(event, props.list.id)}
    >
      <div class="column-heading">
        <span class="column-grip" title="Drag to reorder">
          ⠿
        </span>
        <input
          value={props.list.title}
          aria-label="List title"
          onChange={(event) => renameList(event.currentTarget.value)}
        />
        <span class="card-count">{props.list.cards.length}</span>
        <ConfirmDialog
          triggerLabel={`Delete ${props.list.title}`}
          title={`Delete “${props.list.title}”?`}
          description={`Its ${props.list.cards.length} cards will also be permanently deleted.`}
          confirmLabel="Delete list"
          onConfirm={deleteList}
        >
          <Icon name="menu" size={17} />
        </ConfirmDialog>
      </div>

      <div
        class="column-cards"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => props.dropCard(event, props.list.id, props.list.cards.length)}
      >
        <For each={visibleCards()}>
          {(card) => (
            <BoardCard
              board={props.board}
              card={card}
              onOpen={() => props.openCard(card.id)}
              onDragStart={(event) => props.dragCard(event, card, props.list.id)}
              onDrop={(event) => props.dropCard(event, props.list.id, props.list.cards.indexOf(card))}
            />
          )}
        </For>
        <Show when={visibleCards().length === 0 && props.list.cards.length > 0}>
          <p class="column-filter-empty">No cards match your filters.</p>
        </Show>
      </div>

      <Show
        when={adding()}
        fallback={
          <button type="button" class="add-card-button" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} /> Add a card
          </button>
        }
      >
        <form class="quick-card-form" onSubmit={addCard}>
          <textarea
            autofocus
            value={title()}
            onInput={(event) => setTitle(event.currentTarget.value)}
            placeholder="Enter a title for this card…"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setAdding(false)
              if (event.key === 'Enter' && !event.shiftKey) addCard(event as unknown as SubmitEvent)
            }}
          />
          <div>
            <button class="primary-button compact">Add card</button>
            <button type="button" class="icon-button" aria-label="Cancel" onClick={() => setAdding(false)}>
              <Icon name="close" />
            </button>
          </div>
        </form>
      </Show>
    </section>
  )
}
