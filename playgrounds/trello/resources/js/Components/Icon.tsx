import type { JSX } from '@solidjs/web'

type IconName =
  | 'activity'
  | 'archive'
  | 'board'
  | 'calendar'
  | 'check'
  | 'checklist'
  | 'chevron'
  | 'clock'
  | 'close'
  | 'comment'
  | 'description'
  | 'filter'
  | 'home'
  | 'menu'
  | 'plus'
  | 'search'
  | 'star'
  | 'tag'
  | 'trash'
  | 'users'

type IconProps = {
  name: IconName
  size?: number
  class?: string
  filled?: boolean
}

const paths: Record<IconName, string> = {
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  archive: 'M4 7h16M5 7v12h14V7M3 4h18v3H3zm6 7h6',
  board: 'M4 5h16v14H4zM9 5v14m6-14v14',
  calendar: 'M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1z',
  check: 'm5 12 4 4L19 6',
  checklist: 'm4 7 2 2 3-4m2 3h9M4 14l2 2 3-4m2 3h9',
  chevron: 'm9 18 6-6-6-6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v5l3 2',
  close: 'M6 6l12 12M18 6 6 18',
  comment: 'M4 5h16v12H8l-4 4z',
  description: 'M6 4h12v16H6zM9 8h6m-6 4h6m-6 4h4',
  filter: 'M4 5h16l-6 7v6l-4 2v-8z',
  home: 'm3 11 9-8 9 8v10h-6v-7H9v7H3z',
  menu: 'M5 7h14M5 12h14M5 17h14',
  plus: 'M12 5v14M5 12h14',
  search: 'm20 20-4.5-4.5M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z',
  tag: 'M4 4h7l9 9-7 7-9-9zM8 8h.01',
  trash: 'M4 7h16m-10 4v6m4-6v6M8 7l1-3h6l1 3m2 0-1 14H7L6 7',
  users:
    'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8',
}

export default function Icon(props: IconProps): JSX.Element {
  return (
    <svg
      class={props.class}
      width={props.size ?? 18}
      height={props.size ?? 18}
      viewBox="0 0 24 24"
      fill={props.filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={paths[props.name]} />
    </svg>
  )
}
