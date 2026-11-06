# Working on BTunes

Use English for code, UI text, documentation, and communication. Use Bun for project commands and deps management.

## Formatting and readability

- Use WebStorm's configured code style with four spaces for indentation, including continuation indentation.
- Prefer connected IDE actions for Reformat Code and Optimize Imports.
- Write readable, well-spaced code with descriptive names, one statement per line, early returns, and blank lines between logical steps.
  Avoid compressed JSX, nested ternaries, and oversized components.
- Name event parameters `ev`, not `event`.
- Declare each component's props interface immediately above the component. Leave two blank lines between the interface and the component
  declaration.

## Reuse and organization

- Before creating a helper, hook, primitive, or component, search the repository for an equivalent. Reuse or extend existing code instead of
  duplicating it.
- Compose existing shadcn/ui primitives and extract repeated app UI into shared components. Keep business logic out of presentation
  components.
- Keep shared pure utilities in `src/shared` or `src/renderer/src/lib`, reusable renderer behavior in hooks, filesystem workflows in
  main-process services, and SQLite access in repositories.
- Keep component-local props interfaces beside their components; group reusable types in the relevant `types/` folder. Keep Zod validators
  in `src/shared/schemas/` and infer validated input types from schemas.

## UI and React

- Use Tailwind utilities directly in JSX wherever possible. Reserve CSS for theme tokens, base rules, scrollbars, and animation keyframes.
- Let React Compiler handle renderer memoization. Prefer plain calculations and functions; add manual memoization only for a measured need
  or an explicitly uncompiled library boundary.
- Keep TanStack Virtual's `"use no memo"` boundaries documented and verify scrolling and resizing after relevant changes.

## Backend and data

- Keep RPC contracts typed and validate inputs in main process. Do not add a separate IPC channel for each operation.
- Use Drizzle's schema and query builder for database access. Generate versioned migrations for schema changes and preserve existing
  libraries.

## Verification and handoff

- Test meaningful behavior: file writes, rollback, validation, and persistence. Run `bun run build`, `bun run test`, and
  `bun run test:electron` after relevant changes.
- Documentation-only changes need a diff check, not app tests. `bun run test:electron` already includes `bun run build`; avoid
  running the same build twice without a reason.
- Run `bun run lint` after code changes.
- Run `bun run knip` after changing imports, exports, dependencies, or entry points.
- After completing a change, suggest a conventional commit message.
