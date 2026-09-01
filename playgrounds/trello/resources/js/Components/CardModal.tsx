import { Checkbox } from '@kobalte/core/checkbox'
import {
  CloseButton as DialogCloseButton,
  Content as DialogContent,
  Overlay as DialogOverlay,
  Portal as DialogPortal,
  Root as DialogRoot,
  Title as DialogTitle,
} from '@kobalte/core/dialog'
import { Popover } from '@kobalte/core/popover'
import { RadioGroup } from '@kobalte/core/radio-group'
import { Select } from '@kobalte/core/select'
import { For, Show, createMemo, createSignal } from 'solid-js'
import type { ParentProps } from 'solid-js'
import type { BoardMutation } from '../lib/useLocalBoard'
import type { Board, BoardList, Card, CurrentUser, LabelColor } from '../types/board'
import ConfirmDialog from './ConfirmDialog'
import Icon from './Icon'

type CardModalProps = {
  board: Board
  cardId: string
  currentUser: CurrentUser
  mutate: BoardMutation
  onClose: () => void
}

const labelColors: LabelColor[] = ['green', 'yellow', 'orange', 'red', 'purple', 'blue']

type CardActionPopoverProps = ParentProps<{
  icon: 'board' | 'calendar' | 'tag' | 'users'
  label: string
}>

function CardActionPopover(props: CardActionPopoverProps) {
  return (
    <Popover placement="left-start" gutter={8}>
      <Popover.Trigger class="card-action-popover-trigger">
        <Icon name={props.icon} /> {props.label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content class="detail-popover">
          <Popover.Title class="visually-hidden">{props.label}</Popover.Title>
          {props.children}
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}

export default function CardModal(props: CardModalProps) {
  const [checklistTitle, setChecklistTitle] = createSignal('')
  const [comment, setComment] = createSignal('')
  const [newLabel, setNewLabel] = createSignal('')
  const card = createMemo(() =>
    props.board.lists.flatMap((list) => list.cards).find((item) => item.id === props.cardId),
  )
  const list = createMemo(() => props.board.lists.find((item) => item.cards.some((card) => card.id === props.cardId)))
  const checklistProgress = createMemo(() => {
    const value = card()
    if (!value?.checklist.length) return 0
    return Math.round((value.checklist.filter((item) => item.completed).length / value.checklist.length) * 100)
  })

  const updateCard = (activity: string, update: (value: Card) => void) => {
    props.mutate(activity, (board) => {
      const value = board.lists.flatMap((item) => item.cards).find((item) => item.id === props.cardId)
      if (value) update(value)
    })
  }

  const toggleLabel = (id: string) => {
    updateCard('updated labels on a card', (value) => {
      value.label_ids = value.label_ids.includes(id)
        ? value.label_ids.filter((labelId) => labelId !== id)
        : [...value.label_ids, id]
    })
  }

  const toggleMember = (id: number) => {
    updateCard('updated members on a card', (value) => {
      value.member_ids = value.member_ids.includes(id)
        ? value.member_ids.filter((memberId) => memberId !== id)
        : [...value.member_ids, id]
    })
  }

  const addChecklistItem = (event: SubmitEvent) => {
    event.preventDefault()
    const title = checklistTitle().trim()
    if (!title) return
    setChecklistTitle('')
    updateCard(`added a checklist item to “${card()?.title}”`, (value) => {
      value.checklist.push({ id: crypto.randomUUID(), title, completed: false, position: value.checklist.length })
    })
  }

  const addComment = (event: SubmitEvent) => {
    event.preventDefault()
    const body = comment().trim()
    if (!body) return
    setComment('')
    updateCard(`commented on “${card()?.title}”`, (value) => {
      value.comments.push({
        id: crypto.randomUUID(),
        body,
        created_at: new Date().toISOString(),
        user: props.currentUser,
      })
    })
  }

  const addLabel = (event: SubmitEvent) => {
    event.preventDefault()
    const name = newLabel().trim()
    if (!name) return
    const id = crypto.randomUUID()
    setNewLabel('')
    props.mutate(`created the “${name}” label`, (board) => {
      board.labels.push({ id, name, color: labelColors[board.labels.length % labelColors.length] })
      const value = board.lists.flatMap((item) => item.cards).find((item) => item.id === props.cardId)
      value?.label_ids.push(id)
    })
  }

  const moveCard = (targetListId: string) => {
    const value = card()
    if (!value || targetListId === list()?.id) return
    props.mutate(`moved “${value.title}” to another list`, (board) => {
      let moved: Card | undefined
      for (const boardList of board.lists) {
        const index = boardList.cards.findIndex((item) => item.id === props.cardId)
        if (index >= 0) moved = boardList.cards.splice(index, 1)[0]
      }
      if (moved) board.lists.find((item) => item.id === targetListId)?.cards.push(moved)
    })
  }

  const duplicateCard = () => {
    const value = card()
    if (!value) return
    props.mutate(`duplicated “${value.title}”`, (board) => {
      const target = board.lists.find((item) => item.id === list()?.id)
      if (!target) return
      target.cards.push({
        ...(JSON.parse(JSON.stringify(value)) as Card),
        id: crypto.randomUUID(),
        title: `${value.title} (copy)`,
        checklist: value.checklist.map((item) => ({ ...item, id: crypto.randomUUID() })),
        comments: [],
      })
    })
  }

  const deleteCard = () => {
    const title = card()?.title
    if (!title) return
    props.mutate(`deleted “${title}”`, (board) => {
      for (const boardList of board.lists) {
        boardList.cards = boardList.cards.filter((item) => item.id !== props.cardId)
      }
    })
    props.onClose()
  }

  return (
    <DialogRoot open onOpenChange={(open) => !open && props.onClose()}>
      <DialogPortal>
        <DialogOverlay class="modal-backdrop card-modal-backdrop" />
        <Show when={card()}>
          {(selected) => (
            <DialogContent class="card-modal">
              <DialogTitle class="visually-hidden">{selected().title}</DialogTitle>
              <Show when={selected().cover_color}>
                <div class={`modal-cover label-${selected().cover_color}`}>
                  <button
                    type="button"
                    onClick={() => updateCard('removed a card cover', (value) => (value.cover_color = null))}
                  >
                    Remove cover
                  </button>
                </div>
              </Show>
              <DialogCloseButton class="modal-close" aria-label="Close card">
                <Icon name="close" />
              </DialogCloseButton>
              <div class="card-modal-title">
                <Icon name="board" size={20} />
                <div>
                  <textarea
                    rows="1"
                    value={selected().title}
                    onChange={(event) => {
                      const title = event.currentTarget.value.trim()
                      if (title) updateCard(`renamed a card to “${title}”`, (value) => (value.title = title))
                    }}
                    aria-label="Card title"
                  />
                  <p>
                    in list <strong>{list()?.title}</strong>
                  </p>
                </div>
              </div>

              <div class="card-modal-grid">
                <main class="card-modal-main">
                  <Show when={selected().label_ids.length || selected().member_ids.length || selected().due_at}>
                    <div class="card-detail-summary">
                      <Show when={selected().member_ids.length}>
                        <div>
                          <label>Members</label>
                          <div class="member-row">
                            <For
                              each={props.board.members.filter((member) => selected().member_ids.includes(member.id))}
                            >
                              {(member) => (
                                <span class={`avatar avatar-${member.color}`} title={member.name}>
                                  {member.initials}
                                </span>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>
                      <Show when={selected().label_ids.length}>
                        <div>
                          <label>Labels</label>
                          <div class="modal-label-row">
                            <For each={props.board.labels.filter((label) => selected().label_ids.includes(label.id))}>
                              {(label) => <span class={`label-${label.color}`}>{label.name}</span>}
                            </For>
                          </div>
                        </div>
                      </Show>
                      <Show when={selected().due_at}>
                        <div>
                          <label>Due date</label>
                          <Checkbox
                            class={`date-chip ${selected().completed ? 'done' : ''}`}
                            checked={selected().completed}
                            onChange={(checked) =>
                              updateCard('updated a due date', (value) => (value.completed = checked))
                            }
                          >
                            <Checkbox.Input />
                            <Checkbox.Control class="mini-checkbox">
                              <Checkbox.Indicator>
                                <Icon name="check" size={12} />
                              </Checkbox.Indicator>
                            </Checkbox.Control>
                            <Checkbox.Label>
                              {new Date(selected().due_at!).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Checkbox.Label>
                          </Checkbox>
                        </div>
                      </Show>
                    </div>
                  </Show>

                  <section class="modal-section description-section">
                    <div class="modal-section-heading">
                      <Icon name="description" />
                      <h3>Description</h3>
                    </div>
                    <textarea
                      value={selected().description}
                      onChange={(event) =>
                        updateCard(
                          `updated the description on “${selected().title}”`,
                          (value) => (value.description = event.currentTarget.value),
                        )
                      }
                      placeholder="Add a more detailed description…"
                    />
                  </section>

                  <section class="modal-section checklist-section">
                    <div class="modal-section-heading">
                      <Icon name="checklist" />
                      <h3>Checklist</h3>
                      <span>{checklistProgress()}%</span>
                    </div>
                    <div class="checklist-progress">
                      <i style={{ width: `${checklistProgress()}%` }} />
                    </div>
                    <For each={selected().checklist}>
                      {(item) => (
                        <Checkbox
                          class="checklist-item"
                          checked={item.completed}
                          onChange={(checked) =>
                            updateCard('updated a checklist', (value) => {
                              const target = value.checklist.find((entry) => entry.id === item.id)
                              if (target) target.completed = checked
                            })
                          }
                        >
                          <Checkbox.Input />
                          <Checkbox.Control
                            class={`checklist-control ${item.completed ? 'checked' : ''}`}
                            aria-label={`Mark “${item.title}” ${item.completed ? 'incomplete' : 'complete'}`}
                          >
                            <Checkbox.Indicator>
                              <Icon name="check" size={13} />
                            </Checkbox.Indicator>
                          </Checkbox.Control>
                          <Checkbox.Label class={item.completed ? 'complete' : ''}>{item.title}</Checkbox.Label>
                          <button
                            type="button"
                            aria-label="Delete checklist item"
                            onClick={(event) => {
                              event.stopPropagation()
                              updateCard('removed a checklist item', (value) => {
                                value.checklist = value.checklist.filter((entry) => entry.id !== item.id)
                              })
                            }}
                          >
                            <Icon name="close" size={14} />
                          </button>
                        </Checkbox>
                      )}
                    </For>
                    <form class="checklist-add" onSubmit={addChecklistItem}>
                      <input
                        value={checklistTitle()}
                        onInput={(event) => setChecklistTitle(event.currentTarget.value)}
                        placeholder="Add an item"
                        aria-label="New checklist item"
                      />
                      <button class="secondary-button" disabled={!checklistTitle().trim()}>
                        Add
                      </button>
                    </form>
                  </section>

                  <section class="modal-section activity-section">
                    <div class="modal-section-heading">
                      <Icon name="activity" />
                      <h3>Activity</h3>
                    </div>
                    <form class="comment-form" onSubmit={addComment}>
                      <span class="avatar avatar-teal">
                        {props.currentUser.name
                          .split(' ')
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <div>
                        <textarea
                          value={comment()}
                          onInput={(event) => setComment(event.currentTarget.value)}
                          placeholder="Write a comment…"
                        />
                        <button class="primary-button compact" disabled={!comment().trim()}>
                          Comment
                        </button>
                      </div>
                    </form>
                    <For each={[...selected().comments].reverse()}>
                      {(entry) => (
                        <article class="comment">
                          <span class="avatar avatar-blue">
                            {entry.user.name
                              .split(' ')
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join('')}
                          </span>
                          <div>
                            <p>
                              <strong>{entry.user.name}</strong>
                              <time>
                                {new Date(entry.created_at).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </time>
                            </p>
                            <blockquote>{entry.body}</blockquote>
                          </div>
                        </article>
                      )}
                    </For>
                  </section>
                </main>

                <aside class="card-modal-sidebar">
                  <label>Add to card</label>
                  <CardActionPopover icon="users" label="Members">
                    <For each={props.board.members}>
                      {(member) => (
                        <Checkbox
                          class="detail-option"
                          checked={selected().member_ids.includes(member.id)}
                          onChange={() => toggleMember(member.id)}
                        >
                          <Checkbox.Input />
                          <span class={`avatar avatar-${member.color}`}>{member.initials}</span>
                          <Checkbox.Label>{member.name}</Checkbox.Label>
                          <Checkbox.Control>
                            <Checkbox.Indicator>
                              <Icon name="check" size={14} />
                            </Checkbox.Indicator>
                          </Checkbox.Control>
                        </Checkbox>
                      )}
                    </For>
                  </CardActionPopover>
                  <CardActionPopover icon="tag" label="Labels">
                    <div class="labels-popover">
                      <For each={props.board.labels}>
                        {(label) => (
                          <Checkbox
                            class="detail-option"
                            checked={selected().label_ids.includes(label.id)}
                            onChange={() => toggleLabel(label.id)}
                          >
                            <Checkbox.Input />
                            <i class={`label-${label.color}`} />
                            <Checkbox.Label>{label.name || 'Untitled'}</Checkbox.Label>
                            <Checkbox.Control>
                              <Checkbox.Indicator>
                                <Icon name="check" size={14} />
                              </Checkbox.Indicator>
                            </Checkbox.Control>
                          </Checkbox>
                        )}
                      </For>
                      <form onSubmit={addLabel}>
                        <input
                          value={newLabel()}
                          onInput={(event) => setNewLabel(event.currentTarget.value)}
                          placeholder="New label"
                        />
                        <button class="secondary-button" disabled={!newLabel().trim()}>
                          Add
                        </button>
                      </form>
                    </div>
                  </CardActionPopover>
                  <CardActionPopover icon="calendar" label="Dates">
                    <div class="date-popover">
                      <label for="card-due-date">Due date</label>
                      <input
                        id="card-due-date"
                        type="datetime-local"
                        value={selected().due_at?.slice(0, 16) ?? ''}
                        onChange={(event) =>
                          updateCard(
                            'updated a due date',
                            (value) =>
                              (value.due_at = event.currentTarget.value
                                ? new Date(event.currentTarget.value).toISOString()
                                : null),
                          )
                        }
                      />
                      <button
                        type="button"
                        class="secondary-button"
                        onClick={() => updateCard('removed a due date', (value) => (value.due_at = null))}
                      >
                        Clear date
                      </button>
                    </div>
                  </CardActionPopover>
                  <CardActionPopover icon="board" label="Cover">
                    <RadioGroup
                      class="cover-popover"
                      value={selected().cover_color ?? undefined}
                      onChange={(color) =>
                        updateCard('changed a card cover', (value) => (value.cover_color = color as LabelColor))
                      }
                      aria-label="Card cover color"
                    >
                      <For each={labelColors}>
                        {(color) => (
                          <RadioGroup.Item value={color} class="cover-option">
                            <RadioGroup.ItemInput />
                            <RadioGroup.ItemControl class={`label-${color}`}>
                              <RadioGroup.ItemIndicator>
                                <Icon name="check" size={14} />
                              </RadioGroup.ItemIndicator>
                            </RadioGroup.ItemControl>
                            <RadioGroup.ItemLabel class="visually-hidden">{color} cover</RadioGroup.ItemLabel>
                          </RadioGroup.Item>
                        )}
                      </For>
                    </RadioGroup>
                  </CardActionPopover>
                  <label>Actions</label>
                  <Select<BoardList>
                    options={props.board.lists}
                    optionValue="id"
                    optionTextValue="title"
                    value={list() ?? null}
                    onChange={(target) => target && moveCard(target.id)}
                    itemComponent={(itemProps) => (
                      <Select.Item item={itemProps.item} class="select-item">
                        <Select.ItemLabel>Move to {itemProps.item.rawValue.title}</Select.ItemLabel>
                        <Select.ItemIndicator>
                          <Icon name="check" size={14} />
                        </Select.ItemIndicator>
                      </Select.Item>
                    )}
                  >
                    <Select.Trigger class="card-list-select" aria-label="Move card to list">
                      <Select.Value<BoardList>>{(state) => `Move to ${state.selectedOption().title}`}</Select.Value>
                      <Select.Icon>
                        <Icon name="chevron" size={15} />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content class="select-popover">
                        <Select.Listbox />
                      </Select.Content>
                    </Select.Portal>
                  </Select>
                  <button type="button" onClick={duplicateCard}>
                    <Icon name="plus" /> Duplicate
                  </button>
                  <ConfirmDialog
                    triggerClass="danger"
                    title={`Delete “${selected().title}”?`}
                    description="This card and its checklist and comments will be permanently deleted."
                    confirmLabel="Delete card"
                    onConfirm={deleteCard}
                  >
                    <Icon name="trash" /> Delete
                  </ConfirmDialog>
                </aside>
              </div>
            </DialogContent>
          )}
        </Show>
      </DialogPortal>
    </DialogRoot>
  )
}
