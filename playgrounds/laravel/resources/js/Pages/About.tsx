import { Head, Link } from '@engblock/inertia-solid'
import AppLayout from '../Layouts/AppLayout'

type AboutProps = {
  features: string[]
}

export default function About(props: AboutProps) {
  return (
    <AppLayout>
      <Head title="About" />

      <main class="content">
        <p class="eyebrow">Adapter smoke test</p>
        <h1>Navigation stayed in the SPA.</h1>
        <p class="lede">This route exercises page resolution, reactive props, head updates, and Inertia links.</p>
        <ul class="feature-list">
          {props.features.map((feature) => (
            <li>{feature}</li>
          ))}
        </ul>
        <Link href="/" class="button">
          Back home
        </Link>
      </main>
    </AppLayout>
  )
}
