export type Background = 'ocean' | 'violet' | 'forest' | 'sunset' | 'slate'
export type LabelColor = 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'blue'

export type CurrentUser = {
  id: number
  name: string
}

export type Member = CurrentUser & {
  initials: string
  color: 'violet' | 'blue' | 'teal' | 'rose' | 'amber'
}

export type Label = {
  id: string
  name: string
  color: LabelColor
}

export type ChecklistItem = {
  id: string
  title: string
  completed: boolean
  position: number
}

export type Comment = {
  id: string
  body: string
  created_at: string
  user: CurrentUser
}

export type Card = {
  id: string
  list_id: string
  title: string
  description: string
  position: number
  due_at: string | null
  completed: boolean
  cover_color: LabelColor | null
  label_ids: string[]
  member_ids: number[]
  checklist: ChecklistItem[]
  comments: Comment[]
}

export type BoardList = {
  id: string
  title: string
  position: number
  cards: Card[]
}

export type Activity = {
  id: number
  action: string
  created_at: string
  user: CurrentUser
}

export type Board = {
  id: string
  title: string
  description: string
  background: Background
  starred: boolean
  revision: number
  updated_at: string
  members: Member[]
  labels: Label[]
  lists: BoardList[]
  activity: Activity[]
}

export type BoardSummary = {
  id: string
  title: string
  background: Background
  starred: boolean
  cards_count: number
  updated_at: string
  members: Array<Pick<Member, 'id' | 'name' | 'initials'>>
}
