# Around/Proceed Example

Demonstrates an `around` advice that sanitizes arguments before calling `ctx.proceed`.

```bash
bun run examples/proceed/src/index.ts
```

The logged output shows how negative numbers are converted to positive before multiplication.
