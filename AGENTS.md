<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->

## Running tests

Run unit tests through Nx from the repository root. Paths passed to test options are relative to each project's root, such as `apps/webapp/`, `apps/server/`, or `libraries/<name>/`.

- New tests should be meaningful and verify real behavior or risk. Do not add tests only to increase coverage numbers.

### Webapp

- `yarn nx run webapp:test`
- `yarn nx run webapp:test --testFile=src/script/components/titleBar/titleBar.test.tsx`
- `yarn nx run webapp:test --testFile=src/script/util/componentUtil.test.ts --testNamePattern="returns a new object"`

### Server

- `yarn nx run server:test`
- `yarn nx run server:test --testFile=util/timeUtil.test.ts`
- `yarn nx run server:test --testFile=util/timeUtil.test.ts --testNamePattern="formats the time correctly"`

### Libraries

Library Nx project names end with `-lib`, such as `core-lib` or `api-client-lib`.

- `yarn nx run core-lib:test`
- `yarn nx run core-lib:test --testFile=src/util/numberToHex.test.ts`
- `yarn nx run core-lib:test --testFile=src/util/numberToHex.test.ts --testNamePattern="should convert a number to a hex string"`

## Running ESLint

For investigation, run ESLint once with JSON to `/tmp`, then analyze with `jq`, `rg`, or `node` — do not re-run ESLint for each query.

```bash
yarn eslint --config eslint.config.ts --no-cache -f json -o /tmp/eslint-output.json apps/webapp/src
```

Per-file checks: pass a single file path as the last argument, not `yarn nx run webapp:lint`.

## TypeScript and JavaScript

- Do not introduce new `class` usage in new TypeScript or JavaScript code.
- Exception: extending an existing class hierarchy in the same module is allowed.
- Do not refactor existing classes unless explicitly asked.

## Git

- Commit messages must include a concise subject and a description body explaining what changed and why.
- When changes are ready to commit, prompt the user to run checks first: `yarn type-check`, `BASE_REF=dev yarn lint:affected` (includes Prettier via `lint:format` and Stylelint), and relevant `yarn nx run <project>:test` for touched projects.

## Webapp code rules

When editing `apps/webapp/**/*.{ts,tsx}`:

- Do not call `Date.now()`, `new Date()` for "now", `setTimeout`, `setInterval`, or their `clear*` variants directly in testable logic. Accept a `WallClock` dependency instead.
- Wire production wall clocks with `createWallClock()` from `@enormora/wall-clock/wall-clock` only at composition roots, such as `createApplicationServices` or `RootProvider`.
- Use `wallClock.currentTimestampInMilliseconds`, `wallClock.currentDate`, `wallClock.setTimeout`, and related `WallClock` APIs.
- In tests, pass `createDeterministicWallClock({initialCurrentTimestampInMilliseconds: ...})` via dependencies. Do not use `jest.mock`, `jest.useFakeTimers`, or `jest.setSystemTime` in new tests.
- Import optionals and fallible operation types from `true-myth`.
- Use `Maybe<T>` (`Maybe.just`, `Maybe.nothing`, `Maybe.of`) for optional values instead of `null` or `undefined`.
- Use `Result<T, E>` (`result.ok`, `result.err`) for synchronous fallible operations instead of `try/catch` or `throw`.
- Use `Task<T, E>` (`task.tryOrElse`, `task.fromPromise`) for asynchronous fallible operations instead of `try/catch` or `throw`.
