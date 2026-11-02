# 2026-10-30 - Remove standalone tooling workspaces

> **Status: Accepted.**

## Context

After the repository flattening in PR #22920, three small internal packages remained under `libraries/`.

`copy-config` is part of webapp setup, but it has no application package consumers. Its implementation belongs with repository tooling and can run directly as TypeScript on the pinned Node.js runtime.

`license-collector` has no invocation from Just, GitHub Actions, release or packaging scripts, or other source. The repository's public licensing notice continues to direct readers to Wire's third-party license page. Removing this dormant collector does not change that attribution or any active compliance workflow.

`certificate-check` has no consumer in this repository's webapp, server, build, or packaging paths. `wire-desktop` references its separately published package, so this change removes only the unused local source copy and does not change desktop certificate verification or pinning.

## Decision

Move `copy-config` under `tools/configuration/`, run its `.mts` entry point directly with Node.js, and keep its behavior tests in the tooling Jest project. Remove the unused `license-collector` and `certificate-check` workspaces and their package-specific tooling. Keep the remaining npm workspaces unchanged.

## Consequences

- `npx just setup` no longer compiles a tooling workspace before copying configuration.
- The local license collector and certificate-check source are no longer maintained in this repository.
- Existing configuration selection, generated webapp resources, and `.env.defaults` behavior remain owned by the webapp setup path.
