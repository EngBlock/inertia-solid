import AppLayout from '../../layouts/AppLayout'

function Callback(props: { message: string }) {
  return <h2>Callback page: {props.message}</h2>
}

Callback.layout = (props: { message: string }) => [
  AppLayout,
  { title: `Callback ${props.message}`, showSidebar: false },
]

export default Callback
