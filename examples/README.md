# Examples

- `basic/` – shows before/after/around advice on a decorated class.
- `macros/` – demonstrates compile-time macros (memoize, retry, trace, validate) + runtime helpers.
- `rules/` – registers a custom architecture rule and runs it against a toy import graph.
- `trace/` – wraps a standalone async function with `traceRuntime`.
- `retry/` – stabilizes a flaky async call via `retryRuntime`.
- `memoize/` – caches expensive calculations with `memoizeRuntime`.
- `validate/` – enforces TypeBox schemas with `validateRuntime`.
- `proceed/` – shows how `around` advice can sanitize arguments before `ctx.proceed`.
- `pointcut/` – demonstrates matching class/method/function signatures using selectors.
- `freefn/` – applies advice to a regular function using `weaveFunction`.

Use `bun run examples/<name>/src/index.ts` for runtime demos, or `metadrama build <path>` to inspect transformed output once the compiler is wired.
