# Macro tasks

1. Macro factories live under `src/macros` and must only depend on `src/core` utilities.
2. For `validate`, import `TypeCompiler` from `@sinclair/typebox/compiler` lazily inside the macro so TypeBox stays optional.
3. Memoized functions must emit a unique symbol key via `registry.memoizationBucket` to avoid collisions across files.
