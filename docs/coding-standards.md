# Coding Standards

These standards guide everyday code contributions. They complement the Security Checklist in the PR template.

## 1) Imports, Exports, and Module Boundaries

- Use **named exports only**; avoid default exports.
- Use **named imports only**; do not rename imports with `as`.
- Avoid circular dependencies; keep module boundaries clear.

## 2) TypeScript: Type Safety & Validation

- Avoid `any`, type assertions/casts (`as`, `<Type>`) and the non-null `!` operator unless absolutely necessary and justified.
- Prefer type guards for safe narrowing.
- Validate external data (user input, API responses, storage) before use; handle unexpected shapes.

## 3) Naming, Documentation, and Readability

- Use descriptive names; avoid vague terms/abbreviations.
- Add JSDoc-style comments for methods (purpose, parameters, returns).
- Prefer one statement per line (including split chained calls).
- Prefer modern TS/JS features (destructuring, spread/rest).

## 4) Coding Style & Functionality

- Minimize variable scope; declare variables near first use.
- Prefer early returns over deep nesting.
- Keep helper functions pure and side-effect free.
- Prefer arrow functions unless `this/arguments` semantics are required.
- Ensure no unhandled promises.

## 5) React: Effects, State, and Components

- Do **not** reach for `useEffect` by default; trigger actions from events.
- Use declarative data tools instead of hand-wired effects where possible.
- Each effect has a single responsibility with minimal, stable deps.
- Avoid inline objects/functions that cause re-renders.
- Keep components “dumb” and focused—render from props; move logic up.
- Prefer functional components + hooks.
- Use stable keys in lists (never array indexes).

## 6) Abstraction and Duplication

- Duplication is sometimes better than a wrong abstraction.
- Inline first; abstract once patterns stabilize.
- Be willing to delete/inline poor abstractions.

## 7) Accessibility (a11y)

- Full keyboard support; visible focus; Escape closes modals.
- Use appropriate ARIA landmarks/roles; live regions for async updates.
- Custom components follow accessible patterns (e.g., focus-trapped dialogs, proper labeling, sensible tab order).

## 8) Testing

- Component unit tests for new/changed logic (cover success & failure paths).
- E2E tests for affected critical paths, or mark N/A with a reason.
- For TS modules, include meaningful unit tests; emphasize public APIs; prefer pure functions.

## 9) Technology Choices ([Tech Radar](./tech-radar.md))

- Use well-understood, approved technologies.
- If introducing experimental tech, keep usage limited, justify it.
- Do not introduce unrecommended tech; prefer refactoring/migrating away.

## 10) Documentation

- Update documentation when behavior or usage changes.
- Document migrations.
- Keep PR title/description clear and consistent with the change.
- Link the PR to the relevant Jira ticket.

## 11) PR Formatting & Media

- For UI/design changes, include screenshots or a short video.
- For technical PRs, include a clear description of the problem, scope, and user impact.
- Add inline comments on critical paths/logic to guide reviewers.

---

**Note:** Security-critical checks live in the PR template’s “Security Checklist” and must be explicitly acknowledged there.
