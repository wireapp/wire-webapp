---
applyTo: 'apps/**/*.{ts,tsx}'
description: TypeScript safety rules for all TypeScript files in the monorepo
---

# Copilot — TypeScript safety

- Do not use `any`, type casts (`as T`/`<T>`), or the non-null operator `!`.
- Exported APIs must have explicit types. Narrow with type guards (or schemas) at boundaries.
- Handle `null`/`undefined` explicitly; avoid `@ts-ignore` (unless narrowly scoped with a reason).
