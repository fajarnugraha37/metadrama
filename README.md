# @fajarnugraha37/metadrama

Metadrama brings Metalama-style aspect-oriented programming and compile-time macros to Bun, Node.js, and Vite projects with an SWC-first transform pipeline.

## Install

```bash
bun install @fajarnugraha37/metadrama
```

## Quickstart

```ts
/** @meta */
import { pointcut, around, macro } from '@fajarnugraha37/metadrama'

const services = pointcut.classes.withDecorator('Service').methods

around(services)((ctx) => {
  const start = performance.now()
  const result = ctx.proceed(...ctx.args)
  return ctx.wrap(result, (value) => {
    console.debug('[svc]', ctx.targetName, performance.now() - start, 'ms')
    return value
  })
})

macro.memoize().applyTo(services.name(/^(get|fetch)/))
```

Run the CLI:

```bash
# compile & emit diagnostics
metadrama build
# run rules + type-level validation
metadrama check
# open playground server
metadrama playground

# target alternate roots or outputs
metadrama build examples/basic
metadrama check src/api packages/ui
metadrama build src/api --outDir=build-artifacts
```

See `examples/` for runnable templates (Bun + Node) and `docs/recipes` (coming soon) for best practices.
![Playground demo](docs/assets/playground.gif)

## API Surface

- `pointcut`: fluent selectors for classes/methods/functions (`withDecorator`, `name`, `where`).
- `before | after | around`: register TC39 decorator-compatible advice with inferred `this/args/return`.
- `macro.memoize | retry | trace | validate`: compile-time macros that erase runtime costs; macros register via `applyTo(pointcut)`.
- `rule(name, impl)`: register architecture rules that run during `metadrama build|check`.
- Plugins: `createBunPlugin`, `metadramaVitePlugin`, `createTsPatchTransformer`, `transformWithSwc`.

See `src/index.ts` for exhaustive exports.

## Recipes

1. **Latency tracing**
   ```ts
   const api = pointcut.classes.withDecorator('Api').methods
   macro.trace({ label: 'api' }).applyTo(api.name(/^(get|post)/i))
   ```
2. **Safe retries**
   ```ts
   const external = pointcut.functions.name(/fetch[A-Z]/)
   macro.retry({ max: 3, backoff: 'exp', baseMs: 50 }).applyTo(external)
   ```
3. **Schema validation**
   ```ts
   import { Type } from '@sinclair/typebox'
   const schema = Type.Object({ args: Type.Tuple([Type.String(), Type.Number()]) })
   macro.validate({ schema }).applyTo(pointcut.functions.name('expensiveOperation'))
   ```

## Migration Notes

- From decorator-heavy stacks (Fody, typedi, ts-patch): keep your decorators, add `/** @meta */` pragma, and register equivalent macros so signatures stay intact.
- Run `metadrama check --explain MD1xxx` to understand diagnostics during migration.
- Use the ESLint plugin (`eslint-plugin-metadrama` via `src/rules`) to spot `no-dead-advice`, `valid-pointcut`, and simple banned import patterns.
