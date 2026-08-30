import { Head, Link } from '@engblock/inertia-solid'
import AppLayout from '../Layouts/AppLayout'

type AboutProps = {
  features: string[]
}

function About(props: AboutProps) {
  return (
    <main class="content">
      <Head title="About" />

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
  )
}

About.layout = { app: AppLayout }

export default About
