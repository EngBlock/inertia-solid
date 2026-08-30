import { useHttp } from '@engblock/inertia-solid'
import {
  action,
  createOptimistic,
  createOptimisticStore,
  createSignal,
  flush,
  onCleanup,
  onSettled,
  refresh,
} from 'solid-js'
import type { Board } from '../types/board'

type SyncPayload = {
  base_revision: number
  activity: string
  snapshot: Board
}

type SyncResponse = {
  board: Board
  conflict: boolean
}

type CacheEntry = {
  board: Board
  dirty: boolean
}

export type SyncStatus = 'saved' | 'pending' | 'syncing' | 'offline' | 'error'
export type BoardMutation = (activity: string, update: (board: Board) => void) => void

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function readCache(serverBoard: Board): CacheEntry | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = JSON.parse(localStorage.getItem(`trellis:board:${serverBoard.id}`) ?? 'null') as CacheEntry | null
    return cached?.board.id === serverBoard.id ? cached : null
  } catch {
    return null
  }
}

export default function useLocalBoard(serverBoard: Board) {
  const cached = readCache(serverBoard)
  const initial = cached?.dirty ? cached.board : serverBoard
  const [authoritative, setAuthoritative] = createSignal(clone(initial), { equals: false })
  const [board, setBoard] = createOptimisticStore<Board>(() => authoritative(), clone(initial))
  const initialStatus: SyncStatus = cached?.dirty ? 'pending' : 'saved'
  const [authoritativeStatus, setAuthoritativeStatus] = createSignal(initialStatus)
  const [status, setStatus] = createOptimistic<SyncStatus>(() => authoritativeStatus())
  const form = useHttp<SyncPayload, SyncResponse>({
    base_revision: initial.revision,
    activity: '',
    snapshot: clone(initial),
  })
  const storageKey = `trellis:board:${serverBoard.id}`
  let dirty = cached?.dirty ?? false
  let generation = 0
  let syncing = false
  let syncAgain = false
  let pendingActivity = ''
  let timeout: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  let waiters: Array<{ generation: number; resolve: () => void }> = []

  const persist = (snapshot: Board, isDirty: boolean) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(storageKey, JSON.stringify({ board: snapshot, dirty: isDirty } satisfies CacheEntry))
  }

  const schedule = () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => void syncNow(), 550)
  }

  const normalize = (value: Board) => {
    value.lists.forEach((list, listPosition) => {
      list.position = listPosition
      list.cards.forEach((card, cardPosition) => {
        card.list_id = list.id
        card.position = cardPosition
        card.checklist.forEach((item, itemPosition) => (item.position = itemPosition))
      })
    })
  }

  const waitForSync = (targetGeneration: number) =>
    new Promise<void>((resolve) => waiters.push({ generation: targetGeneration, resolve }))

  const settleThrough = (targetGeneration: number) => {
    const settled = waiters.filter((waiter) => waiter.generation <= targetGeneration)
    waiters = waiters.filter((waiter) => waiter.generation > targetGeneration)
    settled.forEach((waiter) => waiter.resolve())
  }

  const syncNow = async () => {
    if (disposed || !dirty) return
    if (syncing) {
      syncAgain = true
      return
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('offline')
      return
    }

    syncing = true
    syncAgain = false
    const sentGeneration = generation
    const snapshot = clone(board)
    const activity = pendingActivity
    setStatus('syncing')
    form.setData({
      base_revision: snapshot.revision,
      activity,
      snapshot,
    })

    try {
      const response = await form.put(`/api/boards/${snapshot.id}/sync`)
      if (!response) throw new Error('The board could not be synced.')
      if (disposed) return

      setAuthoritative(clone(response.board))
      setAuthoritativeStatus('saved')
      settleThrough(sentGeneration)
      refresh(board)
      flush()

      if (generation === sentGeneration) {
        dirty = false
        pendingActivity = ''
        persist(response.board, false)
      } else {
        persist(clone(board), true)
        syncAgain = true
      }
    } catch {
      if (!disposed) setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error')
    } finally {
      syncing = false
      if (!disposed && syncAgain) schedule()
    }
  }

  const runMutation = action(function* (update: (value: Board) => void, mutationGeneration: number) {
    setBoard((draft) => {
      update(draft)
      normalize(draft)
    })
    persist(clone(board), true)
    schedule()
    yield waitForSync(mutationGeneration)
    refresh(board)
  })

  const mutate: BoardMutation = (activity, update) => {
    if (disposed) return

    flush()
    generation++
    const mutationGeneration = generation
    dirty = true
    pendingActivity = activity
    setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'pending')
    void runMutation(update, mutationGeneration).catch(() => {
      if (!disposed) setStatus('error')
    })
  }

  const handleOnline = () => {
    if (dirty) {
      setStatus('pending')
      void syncNow()
    }
  }

  const handleOffline = () => {
    if (dirty) setStatus('offline')
  }

  onSettled(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    if (dirty) schedule()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  })

  onCleanup(() => {
    disposed = true
    if (timeout) clearTimeout(timeout)
    settleThrough(Number.POSITIVE_INFINITY)
  })

  return { board, mutate, status, syncNow }
}
