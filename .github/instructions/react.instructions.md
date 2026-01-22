---
applyTo: 'apps/webapp/src/**/*.{tsx,jsx}'
description: React code review rules for all React components in the webapp
---

# Copilot — React code review rules

- Prefer event handlers or a data tool over `useEffect`.
- If an effect is necessary, it must: (1) do one thing, (2) have stable deps, (3) avoid inline objects/functions in deps.
- No derived state from props unless justified.
- Keys in lists: stable unique ids; never array indexes.
- Keep UI components “dumb”: render from props; move business logic to a separate module or hook.
