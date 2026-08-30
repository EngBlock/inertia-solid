import { For, Show, createMemo } from 'solid-js'
import Icon from './Icon'
import type { Board, Card } from '../types/board'

type BoardCardProps = {
  board: Board
  card: Card
  onOpen: () => void
  onDragStart: (event: DragEvent) => void
  onDrop: (event: DragEvent) => void
}

function dueState(date: string | null, completed: boolean) {
  if (!date) return null
  const due = new Date(date)
  const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000)
  return {
    text: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    state: completed ? 'complete' : days < 0 ? 'overdue' : days <= 2 ? 'soon' : 'normal',
  }
}

export default function BoardCard(props: BoardCardProps) {
  const labels = createMemo(() => props.board.labels.filter((label) => props.card.label_ids.includes(label.id)))
  const members = createMemo(() => props.board.members.filter((member) => props.card.member_ids.includes(member.id)))
  const checklistDone = createMemo(() => props.card.checklist.filter((item) => item.completed).length)
  const due = createMemo(() => dueState(props.card.due_at, props.card.completed))

  return (
    <article
      class={`task-card ${props.card.completed ? 'completed' : ''}`}
      draggable="true"
      tabindex="0"
      onDragStart={props.onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={props.onDrop}
      onClick={props.onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          props.onOpen()
        }
      }}
    >
      <Show when={props.card.cover_color}>
        <div class={`card-cover label-${props.card.cover_color}`} />
      </Show>
      <Show when={labels().length > 0}>
        <div class="card-labels">
          <For each={labels()}>
            {(label) => (
              <span class={`label-${label.color}`} title={label.name}>
                {label.name}
              </span>
            )}
          </For>
        </div>
      </Show>
      <h4>{props.card.title}</h4>
      <Show
        when={
          props.card.description ||
          props.card.due_at ||
          props.card.checklist.length ||
          props.card.comments.length ||
          members().length
        }
      >
        <div class="card-badges">
          <Show when={props.card.description}>
            <span title="This card has a description">
              <Icon name="description" size={14} />
            </span>
          </Show>
          <Show when={due()}>
            {(value) => (
              <span class={`due-badge ${value().state}`}>
                <Icon name="clock" size={13} />
                {value().text}
              </span>
            )}
          </Show>
          <Show when={props.card.checklist.length > 0}>
            <span class={checklistDone() === props.card.checklist.length ? 'checklist-complete' : ''}>
              <Icon name="checklist" size={14} /> {checklistDone()}/{props.card.checklist.length}
            </span>
          </Show>
          <Show when={props.card.comments.length > 0}>
            <span>
              <Icon name="comment" size={14} /> {props.card.comments.length}
            </span>
          </Show>
          <Show when={members().length > 0}>
            <div class="card-members">
              <For each={members()}>
                {(member) => (
                  <i class={`avatar avatar-${member.color}`} title={member.name}>
                    {member.initials}
                  </i>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </article>
  )
}
