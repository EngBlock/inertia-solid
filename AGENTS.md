# Repository agent instructions

- Implement Solid behavior to the same user-visible contracts and quality bar as Inertia's React and Vue adapters. Before changing an adapter API or browser fixture, compare the corresponding upstream adapter implementations and framework-neutral browser specifications. Framework mechanics may differ; semantics must not.
- Browser fixtures should use the same route semantics and fixture names as the upstream shared suite whenever the behavior applies. Do not hide missing parity behind Solid-specific semantic skips.
- When debugging, symptom-match the report against [`docs/bug-lessons.md`](docs/bug-lessons.md) before forming hypotheses, and carry forward any relevant prevention rules.
