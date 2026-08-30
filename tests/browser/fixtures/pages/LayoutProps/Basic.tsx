import { setLayoutProps } from '@engblock/inertia-solid'
import { createSignal } from 'solid-js'
import AppLayout from '../../layouts/AppLayout'

export default function Basic() {
  const [visible, setVisible] = createSignal(true)

  return (
    <div>
      <h2>Basic Layout Props Page</h2>
      <button
        type="button"
        onClick={() => {
          const next = !visible()
          setVisible(next)
          setLayoutProps({ showSidebar: next })
        }}
      >
        Toggle Sidebar
      </button>
      <button type="button" onClick={() => setLayoutProps({ title: 'Updated Title' })}>
        Update Title
      </button>
    </div>
  )
}

Basic.layout = [AppLayout, { title: 'Basic Layout Props', showSidebar: true }]
