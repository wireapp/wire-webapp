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
- Root-level tooling (`package.json`, `justfile`, Nx, and bin scripts) provides commands shared by apps and libraries

Use `npx just --list` to discover native repository tasks, including type checks, unit tests, and ESLint checks. Nx remains responsible for workspace builds and server tasks that have not migrated yet.

# How to Build the Open Source Client

Prerequisites:

1. Install [Node.js](https://nodejs.org/)
1. Use Node.js 24.22.1 and npm 11.19.0, as pinned by `.nvmrc` and `packageManager`.

## 1. Install Dependencies & Fetch Configuration

1. Run `npm clean-install` (uses npm workspaces and the committed root lockfile)
   - This will install all dependencies and run `npx just configure-webapp` (via root `postinstall`).
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
1. To watch all development libraries without starting the server, run `npx just watch-libraries`.
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

Build a one-shot development-mode WebApp bundle with `npx just build-webapp-development`. The static files are written to `apps/webapp/dist/development`. This does not start the live development server: use `npx just develop` for the server with Rspack watch mode and hot reload. Use `npx just assemble-webapp-development` to assemble the development bundle into the server output.

### Production

Rspack is the sole application bundler for internal and public production builds and local development. Jest continues to use Babel.

1. Build only the internal Rspack WebApp assets: `npx just build-webapp-internal` (or assemble them with `npx just assemble-webapp-internal`)
1. Compile the production server and copy its runtime assets: `npx just build-server` (writes to `apps/server/build/server` after building workspace libraries)
1. Build and package the default internal Rspack release: `npx just package-server-internal`
   - This builds both the server and webapp (in production mode) and creates the deployment package at `apps/server/dist/s3/ebs.zip`
1. Build and package the default public Rspack release: `npx just package-server-public`
1. Start the server output from `apps/server/dist` (or build a Docker image with `npm run docker -- <tag>`)

`npx just build-server` compiles with the server TypeScript project and copies the server runtime assets, including the telemetry embed and compiled local workspace dependencies. It does not remove an existing `apps/server/build/server` directory, and its `build-libraries` prerequisite does not run Nx clean targets. Files for removed or renamed server sources, assets, or library outputs can remain; the Nx `server:build` target cleans its output and Nx cleans upstream library outputs it rebuilds.

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
- Fix ESLint issues: `npx just eslint-fix`
- Type-check: `npx just type-check`
- E2E (Playwright): `npx just e2e-test` (for example, `npx just e2e-test --grep "@regression|@crit-flow-web"`)
- E2E UI mode: `npx just e2e-ui`

## CI Status

[![CI](https://github.com/wireapp/wire-webapp/actions/workflows/continuous-integration.yml/badge.svg?branch=main)](https://github.com/wireapp/wire-webapp/actions/workflows/continuous-integration.yml) [![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

## Translations

All Wire translations are crowdsourced via [Crowdin](https://crowdin.com/projects/wire).

### Add New Strings

**Info:**

- To download translations we use Crowdin API v1, and you need to set up your [username](https://crowdin.com/settings#account) and [api_key](https://crowdin.com/settings#api-key) (Account API key)
- To upload translations we use Crowdin CLI v3, and you will need to set up [project_identifier](https://crowdin.com/project/wire-webapp/settings#api) and [api_token](https://crowdin.com/settings#api-key) (Personal Access Token)

**Setup:**

Create a `keys/crowdin.yaml` in this repository and add the following entries:

```yaml
api_key: your-account-api-key
api_token: your-personal-access-token
project_identifier: wire-webapp
username: your-username
```

**Usage:**

1. Add a string variable to "i18n/en-US.json"
2. Create a PR and merge it after approval. When the PR gets merged, our CI will take care of uploading the English texts to Crowdin

If our CI pipeline is broken, you still have the option to upload new strings manually. For this case, do the following:

1. Install [Crowdin CLI v3](https://support.crowdin.com/cli-tool/)
1. Verify you have a `keys/crowdin.yaml` in place
1. Run `crowdin upload sources` with the Crowdin CLI v3 configuration.

Once translations are uploaded on Crowdin, our (and external) translators can translate the new strings on Crowdin. There is a script that will run to create PRs with translation updates. As an alternative, translations can be downloaded in the following way:

1. Verify your string shows up on the [Crowdin project: wire-webapp](https://crowdin.com/translate/wire-webapp/1224/en-en)
1. Add a translation on Crowdin
1. Approve the translation on Crowdin
1. Run `crowdin download translations` with the Crowdin CLI v3 configuration.

## Contributing

Contributions are welcome! Feel free to check our [issues page](https://github.com/wireapp/wire-webapp/issues).

The following commits will help you get started quickly with our code base:

- [Show a modal / pop-up](https://github.com/wireapp/wire-webapp/commit/00d3d120aacb3f36da80edd1ca829afc045331e9)
- [Sync setting between via backend](https://github.com/wireapp/wire-webapp/commit/3e4595a208189b7b6b51935fd2c41a74bbd16994)
