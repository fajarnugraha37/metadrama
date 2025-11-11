# Architecture bring-up

1. Implement the registry (`src/core/registry.ts`) before advice helpers so decorators can share a single source of truth.
2. Diagnostics must be synchronous and side-effect free; store them on the registry `timeline` for the CLI to consume later.
3. Run `bun run test` after editing any file touching `src/transform/*`.
