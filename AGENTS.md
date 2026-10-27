<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- Use `npx just` for ESLint, unit tests, and migrated repository quality checks. Use Nx for build, e2e, and other tasks that have not migrated.
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->

## Running tests

Run the full unit suite with `npx just test`, coverage and thresholds with `npx just test-ci`, or watch mode with `npx just test-watch`.

For a focused test run, call Jest with the project's existing config from the repository root. Paths passed to `--runTestsByPath` are relative to that project's root.

- New tests should be meaningful and verify real behavior or risk. Do not add tests only to increase coverage numbers.

### Webapp

- `npx jest --config apps/webapp/jest.config.ts`
- `npx jest --config apps/webapp/jest.config.ts --runTestsByPath src/script/components/titleBar/titleBar.test.tsx`
- `npx jest --config apps/webapp/jest.config.ts --runTestsByPath src/script/util/componentUtil.test.ts --testNamePattern="returns a new object"`

### Server

- `npx jest --config apps/server/jest.config.js`
- `npx jest --config apps/server/jest.config.js --runTestsByPath util/timeUtil.test.ts`
- `npx jest --config apps/server/jest.config.js --runTestsByPath util/timeUtil.test.ts --testNamePattern="formats the time correctly"`

### Libraries

- `npx jest --config libraries/core/jest.config.js`
- `npx jest --config libraries/core/jest.config.js --runTestsByPath src/util/numberToHex.test.ts`
- `npx jest --config libraries/core/jest.config.js --runTestsByPath src/util/numberToHex.test.ts --testNamePattern="should convert a number to a hex string"`

## Running ESLint

For investigation, run ESLint once with JSON to `/tmp`, then analyze with `jq`, `rg`, or `node` — do not re-run ESLint for each query.

```bash
npx eslint --config eslint.config.mjs --cache --cache-strategy content --cache-location target/eslint/investigation -f json -o /tmp/eslint-output.json apps/webapp/src
```

Per-file checks: pass a single file path as the last argument. Full repository checks run through `npx just eslint`.

## TypeScript and JavaScript

- Do not introduce new `class` usage in new TypeScript or JavaScript code.
- Exception: extending an existing class hierarchy in the same module is allowed.
- Do not refactor existing classes unless explicitly asked.

## Git

- Commit messages must include a concise subject and a description body explaining what changed and why.
- When changes are ready to commit, prompt the user to run checks first: `npx just type-check`, `npx just eslint`, `npx just format-check`, `npx just stylesheet-lint`, and `npx just test` for unit tests.

## Webapp code rules

When editing `apps/webapp/**/*.{ts,tsx}`:

- Do not call `Date.now()`, `new Date()` for "now", `setTimeout`, `setInterval`, or their `clear*` variants directly in testable logic. Accept a `Clock` dependency from `@enormora/clock/clock` instead.
- Create the production `Clock` with `createClock()` at the application composition root and pass that same instance to code that needs wall time or timers.
- Use `clock.currentUnixEpochMilliseconds` and `clock.currentDate` for calendar and wall time. Use `clock.currentMonotonicMicroseconds` for elapsed-time measurements; subtract monotonic timestamps first, then convert the duration to milliseconds where an existing API expects milliseconds. Never use wall time to measure elapsed durations.
- In tests, pass `createDeterministicClock({initialUnixEpochMicroseconds: ...})` from `@enormora/clock/deterministic-clock` via dependencies. Use `0n` when the calendar date is irrelevant. Convert millisecond values explicitly, for example `BigInt(timestampMilliseconds) * 1_000n`. Do not use `jest.mock`, `jest.useFakeTimers`, or `jest.setSystemTime` in new tests.
- Import optionals and fallible operation types from `true-myth`.
- Use `Maybe<T>` (`Maybe.just`, `Maybe.nothing`, `Maybe.of`) for optional values instead of `null` or `undefined`.
- Use `Result<T, E>` (`result.ok`, `result.err`) for synchronous fallible operations instead of `try/catch` or `throw`.
- Use `Task<T, E>` (`task.tryOrElse`, `task.fromPromise`) for asynchronous fallible operations instead of `try/catch` or `throw`.
