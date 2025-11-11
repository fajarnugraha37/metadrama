# Migration Guide

1. Add `/** @meta */` pragma at the top of files that register advice or macros.
2. Replace legacy weave decorators with metadrama macros:
   - `[Memoize]` ➜ `macro.memoize({ ttlMs: 100 })`
   - `[Retry(Max=3)]` ➜ `macro.retry({ max: 3 })`
3. Keep your existing decorator metadata; the SWC transform erases runtime wrappers once woven.
4. Enforce architecture with `rule(name, ({ graph, fail }) => { ... })`.
