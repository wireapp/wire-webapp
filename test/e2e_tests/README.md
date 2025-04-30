## Please refer to [Playwright doc](https://playwright.dev/docs/intro) for detailed overview of the framework, troubleshooting, and best practices.

# Tests

E2E tests (login.spec.ts and credentialsReader.spec.ts) can be found inside [test folder](/test/e2e_tests/). The folder contains [page objects](/test/e2e_tests/pages), .env file with env variables, and [credentialsReader.ts](/test//e2e_tests/utils/credentialsReader.ts) for access 1Password credentials.

[Playwright config can be found in the root folder of the repo](/playwright.config.ts)

## Running the tests

E2E tests can be run via

1. Executing `npx playwright test` in the root folder of the repo. Running it with `--ui` flag will open Playwright app that can be handy for debugging.
2. via VSCode extension in IDE.
