type Props = {
  form: { code?: string; name?: string }
  method: string
}

export default function Dump(props: Props) {
  return (
    <main>
      <h1>Request dump</h1>
      <p data-testid="method">{props.method}</p>
      <p data-testid="submitted-code">{props.form.code}</p>
      <p data-testid="submitted-name">{props.form.name}</p>
    </main>
  )
}
