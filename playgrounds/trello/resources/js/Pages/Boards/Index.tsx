import { Head, Link, router, useForm } from '@engblock/inertia-solid'
import { For, Show, createMemo, createSignal } from 'solid-js'
import Icon from '../../Components/Icon'
import type { Background, BoardSummary, CurrentUser } from '../../types/board'

type IndexProps = {
  boards: BoardSummary[]
  currentUser: CurrentUser
}

const backgrounds: Array<{ value: Background; label: string }> = [
  { value: 'ocean', label: 'Ocean' },
  { value: 'violet', label: 'Violet' },
  { value: 'forest', label: 'Forest' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'slate', label: 'Slate' },
]

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')

function BoardTile(props: { board: BoardSummary; onStar: () => void; onDelete: () => void }) {
  return (
    <article class={`board-tile background-${props.board.background}`}>
      <Link href={`/boards/${props.board.id}`} class="board-tile-link" aria-label={`Open ${props.board.title}`}>
        <div class="board-tile-shade" />
        <div class="board-tile-content">
          <div>
            <h3>{props.board.title}</h3>
            <p>{props.board.cards_count} cards</p>
          </div>
          <div class="board-tile-members" aria-label={`${props.board.members.length} members`}>
            <For each={props.board.members.slice(0, 3)}>
              {(member) => <span title={member.name}>{member.initials}</span>}
            </For>
          </div>
        </div>
      </Link>
      <button
        type="button"
        class={`board-tile-star ${props.board.starred ? 'active' : ''}`}
        aria-label={props.board.starred ? 'Remove from starred boards' : 'Star board'}
        onClick={props.onStar}
      >
        <Icon name="star" size={17} filled={props.board.starred} />
      </button>
      <button type="button" class="board-tile-delete" aria-label="Delete board" onClick={props.onDelete}>
        <Icon name="trash" size={15} />
      </button>
    </article>
  )
}

export default function BoardsIndex(props: IndexProps) {
  const [query, setQuery] = createSignal('')
  const [creating, setCreating] = createSignal(false)
  const form = useForm<{ title: string; background: Background }>({ title: '', background: 'ocean' })
  const filteredBoards = createMemo(() => {
    const normalized = query().trim().toLowerCase()
    return normalized ? props.boards.filter((board) => board.title.toLowerCase().includes(normalized)) : props.boards
  })
  const starred = createMemo(() => filteredBoards().filter((board) => board.starred))

  const toggleStar = (board: BoardSummary) => {
    router.patch(
      `/boards/${board.id}`,
      { starred: !board.starred },
      {
        preserveScroll: true,
        optimistic: (pageProps) => {
          const boards = (pageProps as unknown as IndexProps).boards

          return {
            boards: boards.map((item) => (item.id === board.id ? { ...item, starred: !item.starred } : item)),
          }
        },
      },
    )
  }

  const deleteBoard = (board: BoardSummary) => {
    if (window.confirm(`Delete “${board.title}”? This cannot be undone.`)) {
      router.delete(`/boards/${board.id}`, { preserveScroll: true })
    }
  }

  const createBoard = (event: SubmitEvent) => {
    event.preventDefault()
    form.post('/boards', {
      onSuccess: () => {
        setCreating(false)
        form.reset()
      },
    })
  }

  return (
    <div class="workspace-shell">
      <Head
        title="Boards"
        tags={[
          {
            tag: 'meta',
            headKey: 'description',
            attrs: { name: 'description', content: 'A local-first project workspace built with Inertia and Solid.' },
          },
        ]}
      />

      <header class="workspace-header">
        <Link href="/" class="logo" aria-label="Trellis home">
          <span class="logo-mark">
            <i />
            <i />
            <i />
          </span>
          <span>Trellis</span>
        </Link>
        <div class="header-search">
          <Icon name="search" size={17} />
          <input
            type="search"
            value={query()}
            onInput={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search boards"
            aria-label="Search boards"
          />
          <kbd>⌘ K</kbd>
        </div>
        <div class="header-actions">
          <button type="button" class="header-icon" aria-label="Open notifications">
            <span class="notification-dot" />
            <Icon name="activity" />
          </button>
          <span class="avatar avatar-teal" title={props.currentUser.name}>
            {initials(props.currentUser.name)}
          </span>
        </div>
      </header>

      <aside class="workspace-sidebar">
        <nav aria-label="Workspace navigation">
          <a href="#boards" class="active">
            <Icon name="board" /> Boards
          </a>
          <a href="#starred">
            <Icon name="star" /> Starred
          </a>
          <a href="#activity">
            <Icon name="activity" /> Activity
          </a>
        </nav>
        <div class="sidebar-divider" />
        <div class="workspace-label">
          <span>Your workspace</span>
          <button type="button" aria-label="Add workspace">
            <Icon name="plus" size={15} />
          </button>
        </div>
        <div class="workspace-person">
          <span class="workspace-icon">T</span>
          <div>
            <strong>Trellis Studio</strong>
            <small>Free workspace</small>
          </div>
          <Icon name="chevron" size={15} />
        </div>
        <div class="sidebar-note">
          <Icon name="check" size={15} />
          <div>
            <strong>Local-first</strong>
            <span>Your board edits are saved on this device before they sync.</span>
          </div>
        </div>
      </aside>

      <main class="boards-main" id="boards">
        <div class="boards-title-row">
          <div>
            <p class="section-kicker">Trellis Studio</p>
            <h1>Your boards</h1>
          </div>
          <button type="button" class="primary-button" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> New board
          </button>
        </div>

        <Show when={starred().length > 0}>
          <section id="starred" class="board-section">
            <h2>
              <Icon name="star" size={17} /> Starred
            </h2>
            <div class="board-grid">
              <For each={starred()}>
                {(board) => (
                  <BoardTile board={board} onStar={() => toggleStar(board)} onDelete={() => deleteBoard(board)} />
                )}
              </For>
            </div>
          </section>
        </Show>

        <section class="board-section">
          <h2>
            <Icon name="clock" size={17} /> Recently viewed
          </h2>
          <div class="board-grid">
            <For each={filteredBoards()}>
              {(board) => (
                <BoardTile board={board} onStar={() => toggleStar(board)} onDelete={() => deleteBoard(board)} />
              )}
            </For>
            <button type="button" class="create-board-tile" onClick={() => setCreating(true)}>
              <span>
                <Icon name="plus" size={21} />
              </span>
              <strong>Create new board</strong>
              <small>Start from a clean slate</small>
            </button>
          </div>
          <Show when={filteredBoards().length === 0}>
            <div class="empty-state">
              <Icon name="search" size={28} />
              <h3>No boards found</h3>
              <p>Try a different search.</p>
            </div>
          </Show>
        </section>
      </main>

      <Show when={creating()}>
        <div class="modal-backdrop" role="presentation" onMouseDown={() => setCreating(false)}>
          <section
            class="create-board-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-board-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" class="modal-close" aria-label="Close" onClick={() => setCreating(false)}>
              <Icon name="close" />
            </button>
            <p class="section-kicker">A fresh start</p>
            <h2 id="create-board-title">Create a board</h2>
            <p>Choose a name and a background. You can change both later.</p>
            <div class={`board-preview background-${form.data.background}`}>
              <span />
              <span />
              <span />
            </div>
            <form onSubmit={createBoard}>
              <label for="board-title">Board title</label>
              <input
                id="board-title"
                autofocus
                value={form.data.title}
                onInput={(event) => form.setData('title', event.currentTarget.value)}
                placeholder="e.g. Q4 launch"
              />
              <Show when={form.errors.title}>
                <p class="field-error">{form.errors.title}</p>
              </Show>
              <fieldset>
                <legend>Background</legend>
                <div class="background-options">
                  <For each={backgrounds}>
                    {(background) => (
                      <button
                        type="button"
                        class={`background-swatch background-${background.value} ${form.data.background === background.value ? 'selected' : ''}`}
                        onClick={() => form.setData('background', background.value)}
                        aria-label={background.label}
                        aria-pressed={form.data.background === background.value ? 'true' : 'false'}
                      >
                        <Icon name="check" size={15} />
                      </button>
                    )}
                  </For>
                </div>
              </fieldset>
              <button class="primary-button wide" disabled={form.processing || !form.data.title.trim()}>
                {form.processing ? 'Creating…' : 'Create board'}
              </button>
            </form>
          </section>
        </div>
      </Show>
    </div>
  )
}
