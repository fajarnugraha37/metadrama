# Copilot Usage Notes

- Prefer TypeScript helpers that preserve inference over explicit interface declarations.
- When editing transformer logic, focus on pure functions that accept a PhaseContext and return a new IR node rather than mutating shared state.
- Never emit `any` in public APIs; use conditional types from `src/core/types.ts` helpers.
- Keep diagnostics human: include `code`, `summary`, and `fix` suggestions.
