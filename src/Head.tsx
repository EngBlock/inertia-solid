import { useContext, createEffect, onCleanup, untrack } from 'solid-js'
import { HeadContext } from './contexts'

export type HeadTagDescriptor = {
  tag: string
  headKey?: string
  attrs?: Record<string, string | number | boolean | null | undefined>
  children?: string
  innerHTML?: string
}

export interface HeadProps {
  title?: string
  tags?: HeadTagDescriptor[]
  /** Native JSX children cannot be collected without a retained VDOM. Use `tags`. */
  children?: never
}

const escapeAttribute = (value: unknown): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

const escapeText = (value: unknown): string =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const voidTags = new Set(['base', 'link', 'meta'])

function serializeTag(descriptor: HeadTagDescriptor): string {
  const attributes = {
    ...descriptor.attrs,
    'data-inertia': descriptor.headKey ?? '',
  }
  const serializedAttributes = (Object.entries(attributes) as Array<
    [string, string | number | boolean | null | undefined]
  >)
    .filter(([, value]) => value !== false && value !== null && value !== undefined)
    .map(([name, value]) => (value === true ? name : `${name}="${escapeAttribute(value)}"`))
    .join(' ')
  const opening = `<${descriptor.tag}${serializedAttributes ? ` ${serializedAttributes}` : ''}>`

  if (voidTags.has(descriptor.tag)) {
    return opening
  }

  const content = descriptor.innerHTML ?? escapeText(descriptor.children ?? '')
  return `${opening}${content}</${descriptor.tag}>`
}

export default function Head(props: HeadProps): null {
  const manager = useContext(HeadContext)
  const provider = manager.createProvider()
  provider.reconnect()

  const elements = (title: string | undefined, tags: HeadTagDescriptor[]) => [
    ...(title ? [`<title data-inertia="">${escapeText(title)}</title>`] : []),
    ...tags.map(serializeTag),
  ]

  untrack(() => provider.update(elements(props.title, props.tags ?? [])))

  createEffect(
    () => ({ title: props.title, tags: props.tags ?? [] }),
    ({ title, tags }) => provider.update(elements(title, tags)),
    { defer: true },
  )

  onCleanup(() => provider.disconnect())

  return null
}
