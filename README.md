# Wire™

[![We are hiring](https://github.com/wireapp/wire/blob/master/assets/header-small.png?raw=true)](https://www.linkedin.com/company/wire-secure-communication/jobs/)

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp/wire](https://github.com/wireapp/wire).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

If you compile the open source software that we make available from time to time to develop your own mobile, desktop, or web application, and cause that application to connect to our servers for any purposes, we refer to that resulting application as an "Open Source App". All Open Source Apps are subject to, and may only be used and/or commercialized in accordance with, the Terms of Use applicable to Wire Application, which can be found at https://wire.com/legal/#terms. Additionally, if you choose to build an Open Source App, certain restrictions apply, as follows:

a. You agree not to change the way the Open Source App connects and interacts with our servers;
b. You agree not to weaken any of the security features of the Open Source App;
c. You agree not to use our servers to store data for purposes other than the intended and original functionality of the Open Source App;
d. You acknowledge that you are solely responsible for any and all updates to your Open Source App.

For clarity, if you compile the open source software that we make available from time to time to develop your own mobile, desktop, or web application, and do not cause that application to connect to our servers for any purposes, then that application will not be deemed an Open Source App and the foregoing will not apply to that application.

No license is granted to the Wire trademark and its associated logos, all of which will continue to be owned exclusively by Wire Swiss GmbH. Any use of the Wire trademark and/or its associated logos is expressly prohibited without the express prior written consent of Wire Swiss GmbH.

# Monorepo Layout

- `apps/webapp/`: React client (Rspack internal, public production, and development), plus E2E tests and i18n files
- `apps/server/`: node/express wrapper that serves the built webapp and handles proxying
- `libraries/config/`: `@wireapp/config` package - centralized environment configuration management with type-safe configuration loading and validation
- `libraries/core/`: `@wireapp/core` package - Wire's communication core library handling authentication, WebSocket connections, and protocol messaging
- Root-level tooling (`justfile`, npm workspaces, and `tools/`) provides commands shared by apps and libraries

Use `npx just --list` to discover repository tasks, including builds, development, type checks, unit tests, linting, E2E, and translation management.

# How to Build the Open Source Client

Prerequisites:

1. Install [Node.js](https://nodejs.org/)
1. Use Node.js 26.12.1, as pinned by `.nvmrc`.
1. Use npm 11.20.0, bundled with Node.js 26.12.1 and declared by the root `package.json` `packageManager` field.
1. The `devEngines` checks require Node.js `>=26.12.1 <27` and npm `>=11.20.0 <12` for `npm install` and `npm clean-install`.

## 1. Install Dependencies & Fetch Configuration

1. Run `npm clean-install` to install dependencies from the committed root lockfile.
1. Run `npx just setup` to apply dependency patches, fetch the webapp configuration, generate React icons, and validate their types.
   - `configure-webapp` uses `apps/webapp/app-config/package.json` to select a config repository version (`wire-web-config-wire` or `wire-web-config-default`), then copies:
     - config content into `apps/webapp/resource/`
     - `.env.defaults` into repository root
   - Runtime priority is: process environment (for example AWS) > `.env` > `.env.defaults` > code fallback.

## 2. Build & Run

### Development

1. Copy `.env.localhost` to `.env` to override/extend defaults
1. Add the following entries to your hosts file (macOS / Linux: `/etc/hosts`, Windows 10: `%WINDIR%\system32\drivers\etc\hosts`):
   - `127.0.0.1 local.zinfra.io` (to connect with the staging backend)
   - `127.0.0.1 local.imai.wire.link` (to connect with the imai backend)
1. Run `npx just develop`; Just builds the workspace libraries and server output, then starts the Express server, its TypeScript watcher, and watchers for the WebApp's upstream libraries. Rspack compiles the WebApp in memory and serves it at https://local.zinfra.io:8081/auth/ with React Fast Refresh.
1. Server TypeScript changes are recompiled with `tsc --watch`; `node --watch` restarts the compiled Express server when its output changes. `concurrently` stops sibling processes if any watcher exits.
1. `npx just develop-watch` is an alternative to `npx just develop`: it starts the server with libraries you select interactively. Choose one development command; do not run `develop-watch` alongside `develop`.
1. To watch one library without the server, run `npx just watch-library core`. Use `npx just watch-library-telemetry` to copy telemetry assets and watch both TypeScript module formats.
1. In case you're facing a CORS issue after login when the app tries to fetch `self/consent` from the backend, append
   `FEATURE_CHECK_CONSENT="false"` to the env file

#### Install Self-Signed Certificate

If you would like your browser to trust the certificate from "local.wire.com"/"local.zinfra.io"/"local.imai.wire.link":

1. Download [mkcert](https://github.com/FiloSottile/mkcert/releases/latest) - Installation on Mac: `brew install mkcert` (refer to the latest [README.md](https://github.com/FiloSottile/mkcert))
2. Set the `CAROOT` environment variable to `<WebApp Dir>/apps/server/certificate`
3. Run `mkcert -install`

#### Environment Configuration

The application can be configured to connect to different environments by modifying the following environment variables in your `.env` file:

For the full environment variable reference, see [Environment Variables](https://github.com/wireapp/wire-webapp/blob/main/libraries/config/README.md#environment-variables).

**Staging:**

```
APP_BASE="https://local.zinfra.io:8081"
BACKEND_REST="https://staging-nginz-https.zinfra.io"
BACKEND_WS="wss://staging-nginz-ssl.zinfra.io"
```

**Imai:**

```
APP_BASE="https://local.imai.wire.link:8081"
BACKEND_REST="https://nginz-https.imai.wire.link"
BACKEND_WS="https://nginz-ssl.imai.wire.link"
```

**Local:**

```
APP_BASE="http://localhost:8081"
BACKEND_REST="http://localhost:8080"
BACKEND_WS="ws://localhost:8080"
```

After updating the environment variables, the app will be available at the corresponding `APP_BASE` URL.

### Development bundle

Build a one-shot development-mode WebApp bundle with `npx just build-webapp-development`. The static files are written to `apps/webapp/dist/development`. This does not start the live development server: use `npx just develop` for the server with Rspack watch mode and hot reload.

### Production

Rspack is the sole application bundler for internal and public production builds and local development. Jest continues to use Babel.

1. Build only the internal Rspack WebApp assets: `npx just build-webapp-internal`
1. Compile the production server and copy its runtime assets: `npx just build-server` (writes to `apps/server/build/server` after building workspace libraries)
1. Build and package the default internal Rspack release: `npx just package-server-internal`
   - This builds both the server and webapp (in production mode) and creates the deployment package at `apps/server/dist/s3/ebs.zip`
1. Build and package the default public Rspack release: `npx just package-server-public`
1. Start the server output from `apps/server/dist` (or build a Docker image with `npx just docker <tag>`)

`npx just build-server` compiles with the server TypeScript project and copies the server runtime assets, including the telemetry embed and compiled local workspace dependencies. It does not remove an existing `apps/server/build/server` directory.

**Note:** The `zip` command has been deprecated. Packaging is integrated into the build process via `npx just package-server-internal`.

## Testing

Run all unit tests:

```bash
npx just test
```

Run `npx just test-ci` to execute each Jest project with coverage and its existing project-specific thresholds. CI uses this command inside the network-isolation wrapper and uploads HTML and LCOV reports for the webapp, server, core, and API client. Use `npx just test-watch` for watch mode.

Other useful tasks:

- Lint: `npx just lint`
- ESLint only: `npx just eslint`
- Fix ESLint issues: `npx just eslint --fix`
- Type-check: `npx just type-check`
- E2E (Playwright): `npx just e2e-test` (for example, `npx just e2e-test --grep "@regression|@crit-flow-web"`)
- E2E UI mode: `npx just e2e-ui`

## CI Status

[![CI](https://github.com/wireapp/wire-webapp/actions/workflows/continuous-integration.yml/badge.svg?branch=main)](https://github.com/wireapp/wire-webapp/actions/workflows/continuous-integration.yml) [![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

## Translations

All Wire translations are crowdsourced via [Crowdin](https://crowdin.com/projects/wire).

### Local translation tasks

Install dependencies with `npm clean-install` and run `npx just setup`. Create a [Crowdin personal access token](https://crowdin.com/settings#api-key), then set it in your shell:

```sh
export CROWDIN_PERSONAL_TOKEN="<personal-access-token>"
```

The committed `crowdin.yaml` is the CLI configuration. It keeps the Crowdin project ID and translation paths; authentication comes from `CROWDIN_PERSONAL_TOKEN`. Do not add credentials to the configuration file.

Use these Just recipes from the repository root:

- `npx just translate-extract` scans i18next strings in webapp JavaScript, HTML, and template files.
- `npx just translate-merge` extracts FormatJS strings and merges them into `apps/webapp/src/i18n/en-US.json` using the custom formatter.
- `npx just translate-validate` checks translation file structure and placeholder markers against the canonical English file.
- `npx just translate-upload` runs both source extraction steps and explicitly uploads source strings only. It does not upload translated locale files.
- `npx just translate-download` explicitly downloads translated locale files and validates their placeholders.

Uploads and downloads are opt-in local actions. After an English source change is reviewed and merged to `main`, the push workflow prepares the canonical source strings and uses the pinned Crowdin GitHub Action to upload sources. The manually dispatched pull workflow downloads translations, validates placeholders, and opens the existing translation pull request. These workflows remain separate from the local Just commands.

## Contributing

Contributions are welcome! Feel free to check our [issues page](https://github.com/wireapp/wire-webapp/issues).

The following commits will help you get started quickly with our code base:

- [Show a modal / pop-up](https://github.com/wireapp/wire-webapp/commit/00d3d120aacb3f36da80edd1ca829afc045331e9)
- [Sync setting between via backend](https://github.com/wireapp/wire-webapp/commit/3e4595a208189b7b6b51935fd2c41a74bbd16994)
