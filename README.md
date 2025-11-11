# @fajarnugraha37/metadrama

> A production-ready aspect-oriented programming (AOP) framework for TypeScript
> **Status:** Production Ready ✅ | **Phase 4:** Complete ✨ | **Coverage:** 62%

Metadrama brings Metalama-style aspect-oriented programming and compile-time macros to Bun, Node.js, and Vite projects with an SWC-first transform pipeline. Zero runtime overhead through compile-time code generation.

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

See `examples/` for runnable templates (Bun + Node) and `docs/recipes` for best practices.
![Playground demo](docs/assets/playground.gif)

## Features

- **Compile-time Transformations** - Zero runtime overhead through build-time code generation
- **Pointcut Matching** - Declarative targeting of methods, classes, and patterns  
- **Advice System** - Before, after, and around advice with powerful context access
- **Macro Expansion** - Built-in macros for common patterns like memoization and retry logic
- **TypeScript Integration** - Full type safety and editor support via ts-patch
- **Multi-Platform** - Works with SWC, Vite, Bun, and TypeScript compiler
- **Production Ready** - Comprehensive test suite with 32/32 tests passing
- **Architecture Rules** - ESLint integration for validating patterns

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

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Source Code    │───▶│   MetaDrama      │───▶│  Transformed    │
│  with Aspects   │    │   Transformer    │    │  JavaScript     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Advice &       │
                    │   Macro Registry │
                    └──────────────────┘
```

## Plugin Integrations

### TypeScript Compiler (ts-patch)
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "plugins": [
      { "transform": "@fajarnugraha37/metadrama/ts-patch" }
    ]
  }
}
```

### SWC
```typescript
// .swcrc
{
  "jsc": {
    "experimental": {
      "plugins": [["@fajarnugraha37/metadrama/swc", {}]]
    }
  }
}
```

### Vite
```typescript
// vite.config.ts
import { metadramaVitePlugin } from '@fajarnugraha37/metadrama/vite'

export default {
  plugins: [metadramaVitePlugin()]
}
```

### Bun
```typescript
// bunfig.toml
[build]
plugins = ["@fajarnugraha37/metadrama/bun-esbuild"]
```

## Production Status

- ✅ **Core Framework** - Complete with comprehensive API
- ✅ **TypeScript Integration** - Full ts-patch transformer with 87% coverage
- ✅ **SWC Plugin** - Complete integration with 95% coverage  
- ✅ **Advice System** - Before/after/around with context preservation
- ✅ **Macro System** - Memoize, retry, trace, validate macros
- ✅ **Test Suite** - 32/32 tests passing, 62% overall coverage
- ✅ **CLI Tools** - Build, check, and playground commands
- ✅ **Multi-Platform** - Works across TypeScript, SWC, Vite, Bun

## Migration Notes

- From decorator-heavy stacks (Fody, typedi, ts-patch): keep your decorators, add `/** @meta */` pragma, and register equivalent macros so signatures stay intact.
- Run `metadrama check --explain MD1xxx` to understand diagnostics during migration.
- Use the ESLint plugin (`eslint-plugin-metadrama` via `src/rules`) to spot `no-dead-advice`, `valid-pointcut`, and simple banned import patterns.

## License

MIT License - see LICENSE file for details.
