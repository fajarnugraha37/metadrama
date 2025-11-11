# Basic Example

Demonstrates decorator-based advice applied at runtime. Run with Bun:

```bash
bun run examples/basic/src/index.ts
# or transform + inspect emitted code
metadrama build examples/basic
```

Expect console output showing before/after logs and per-call timing for the `InventoryService`.
