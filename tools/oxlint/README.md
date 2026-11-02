# Oxlint experiment

This directory contains compatibility adapters for the non-blocking Oxlint CI experiment. ESLint remains the repository's source of truth and its configuration and CI job are intentionally unchanged.

The root `.oxlintrc.json` was bootstrapped with `@oxlint/migrate` using type-aware and nursery rule conversion, then adjusted to:

- preserve production and test file scoping;
- run supported React, Jest, accessibility, TypeScript, Unicorn, and import rules natively;
- run existing third-party rules through Oxlint's ESLint-compatible JavaScript plugin API;
- preserve the custom `no-restricted-syntax`, import ordering, and import resolution policies; and
- load plugins without ESLint v9 metadata through the adapters in `plugins/`.

## Current experiment boundary

Type-aware execution is disabled in `.oxlintrc.json`. `oxlint-tsgolint` uses TypeScript 7 semantics and currently rejects repository compiler options including `downlevelIteration`, `moduleResolution: "node"`, and `baseUrl`. The type-aware rules remain configured so they can be enabled after the TypeScript configuration is migrated.

Oxlint does not consume existing `eslint-disable` comments. Some diagnostics therefore remain expected differences until an eventual migration duplicates or converts those directives.

Run the experiment locally after the normal lint prerequisites:

```sh
npx just setup
npx just build-libraries
npx oxlint . --format github
```
