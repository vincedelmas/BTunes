# Working on BTunes

- Use WebStorm formatting and import organization (Reformat Code + Optimize Imports). Do not install or run Prettier.
- Use four spaces for indentation, including continuation indentation. Preserve the configured WebStorm code style.
- Prefer the connected IDE actions when available. The WebStorm command-line formatter can reformat files, but does not replace Optimize
  Imports; never claim IDE actions ran unless they did.
- use `ev` instead of `event`
- Write readable, well-spaced code. Use descriptive names, one statement per line, early returns, and blank lines between logical steps.
  Avoid compressed JSX, nested ternaries, and oversized components.
- Before creating a helper, hook, primitive, or component, search the repo for an existing equivalent. Reuse or extend it
  instead of duplicating nearly identical functions.
- Compose existing shadcn/ui primitives. Extract repeated app UI into shared components; keep business logic out of presentation
  components.
- Keep shared pure utilities in `src/shared` or `src/renderer/src/lib`, reusable renderer behavior in hooks, filesystem workflows in
  main-process services, and SQLite access in repos.
- Keep RPC contracts typed and validate inputs in the main process. Do not add a separate IPC channel for each operation.
- Test only meaningful behavior: file writes, rollback, validation, and persistence. Run `bun run build`, `bun run test`, and
  `bun run test:electron` after relevant changes.

- Use shadcn's Nova style with Base UI primitives. Follow Base UI's `render` composition API rather than Radix's `asChild`.
- Use Drizzle's schema and query builder for database access. Generate versioned migrations for schema changes; preserve existing libraries.
- Run `bun run knip` after changing imports, exports, dependencies, or entry points. Do not silence application findings with broad ignore
  rules.
- After creating the feature, fix, refactor, etc. give me the name of the commit using a conventional commit message.


- Group reusable types in the relevant `types/` folder and Zod validators in `src/shared/schemas/`. Infer validated input types from
  schemas.
- Run `bun run lint` after changes. Keep Oxlint's type-aware `typescript/no-deprecated` rule enabled; replace deprecated APIs instead of
  suppressing them.
- please do that for the types of the components with the interface above it:

```typescript
interface CoverProps {
    track?: Track;
    large?: boolean;
}


export function Cover({ track, large = false }: CoverProps) {
    //...
}
```
