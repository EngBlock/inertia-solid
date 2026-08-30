import type { Element } from 'solid-js'

function RenderFunction() {
  return <h2>Render function page</h2>
}

RenderFunction.layout = (page: Element) => <section data-testid="render-function-layout">{page}</section>

export default RenderFunction
