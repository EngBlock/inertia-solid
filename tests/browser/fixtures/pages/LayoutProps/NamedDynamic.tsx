import { Link, resetLayoutProps, setLayoutProps } from '@engblock/inertia-solid'
import AppLayout from '../../layouts/AppLayout'
import ContentLayout from '../../layouts/ContentLayout'

export default function NamedDynamic() {
  return (
    <div>
      <h2>Named Dynamic Layout Page</h2>
      <button type="button" onClick={() => setLayoutProps('app', { title: 'Updated App Title' })}>
        Update App Title
      </button>
      <button type="button" onClick={() => setLayoutProps('content', { padding: 'xl' })}>
        Update Content Padding
      </button>
      <button
        type="button"
        onClick={() => {
          setLayoutProps({ title: 'Shared Title' })
          setLayoutProps('app', { title: 'Named Title' })
        }}
      >
        Set competing titles
      </button>
      <button type="button" onClick={resetLayoutProps}>
        Reset Layout Props
      </button>
      <Link href="/layout-props/basic">Go to Basic Page</Link>
    </div>
  )
}

NamedDynamic.layout = {
  app: [AppLayout, { title: 'Named Dynamic Page' }],
  content: [ContentLayout, { padding: 'md' }],
}
