# Macros Example

Declares memoize/retry/trace/validate macros for a `ProfileService`. Build the project to see macros weaved:

```bash
# run the service directly (helpful for quick smoke tests)
bun run examples/macros/src/index.ts

# compile with metadrama to see how macros weave into emitted code
metadrama build examples/macros --outDir=examples/dist
```

The generated output contains memoization caches, retry wrappers, and trace hooks around the service methods, while the runtime script demonstrates the observable behavior.
