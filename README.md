# Wire™

[![We are hiring](https://github.com/wireapp/wire/blob/master/assets/header-small.png?raw=true)](https://www.linkedin.com/company/wire-secure-communication/jobs/)

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp/wire](https://github.com/wireapp/wire).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

If you compile the open source software that we make available from time to time to develop your own mobile, desktop or web application, and cause that application to connect to our servers for any purposes, we refer to that resulting application as an “Open Source App”. All Open Source Apps are subject to, and may only be used and/or commercialized in accordance with, the Terms of Use applicable to the Wire Application, which can be found at https://wire.com/legal/#terms. Additionally, if you choose to build an Open Source App, certain restrictions apply, as follows:

a. You agree not to change the way the Open Source App connects and interacts with our servers; b. You agree not to weaken any of the security features of the Open Source App; c. You agree not to use our servers to store data for purposes other than the intended and original functionality of the Open Source App; d. You acknowledge that you are solely responsible for any and all updates to your Open Source App.

For clarity, if you compile the open source software that we make available from time to time to develop your own mobile, desktop or web application, and do not cause that application to connect to our servers for any purposes, then that application will not be deemed an Open Source App and the foregoing will not apply to that application.

No license is granted to the Wire trademark and its associated logos, all of which will continue to be owned exclusively by Wire Swiss GmbH. Any use of the Wire trademark and/or its associated logos is expressly prohibited without the express prior written consent of Wire Swiss GmbH.

# Monorepo layout

- `apps/webapp/`: the client (Webpack/React) plus E2E tests and i18n files.
- `apps/server/`: the node/express wrapper that serves the built webapp and handles proxying.
- `apps/webapp/app-config/`: configuration bundles fetched via `copy-config`.
- `apps/webapp/.copyconfigrc.js`: copy-config setup (runs from the repo root, writes into `apps/webapp/resource`).
- `libraries/config/`: the `@wireapp/config` package - centralized environment configuration management with type-safe configuration loading and validation.
- `libraries/core/`: the `@wireapp/core` package - Wire's communication core library handling authentication, WebSocket connections, and protocol messaging.
- Root-level tooling (`package.json`, Nx, husky, bin scripts) orchestrates both apps and libraries.

The root `yarn` and `nx` scripts are the entry points; package-level scripts delegate to them.

# How to build the open source client

Prerequisites:

1. Install [Node.js](https://nodejs.org/)
1. Install [Yarn](https://yarnpkg.com)

## 1. Install deps & fetch configuration

1. Run `yarn` (uses Yarn 4 workspaces)
   - This will install all dependencies and fetch a [configuration](https://github.com/wireapp/wire-web-config-wire/) for the application into `apps/webapp/resource/`

## 2. Build & run

### Development

1. Copy `.env.localhost` to `.env` to override/extend defaults.
1. Add the following entries to your hosts file (macOS / Linux: `/etc/hosts`, Windows 10: `%WINDIR%\system32\drivers\etc\hosts`):
   - `127.0.0.1 local.zinfra.io` (to connect with staging backend)
   - `127.0.0.1 local.imai.wire.link` (to connect with imai backend)
1. Run `yarn nx build webapp --configuration=development` to build static assets
1. Run `yarn start` (runs `nx serve server`); the app will be available at https://local.zinfra.io:8081/auth/

#### Install the self-signed certificate

If you would like your browser to trust the certificate from "local.wire.com"/"local.zinfra.io"/"local.imai.wire.link":

1. Download [mkcert](https://github.com/FiloSottile/mkcert/releases/latest) Installation on Mac `brew install mkcert` [refer to latest readme.md](https://github.com/FiloSottile/mkcert)
2. Set the `CAROOT` environment variable to `<WebApp Dir>/apps/server/certificate`
3. Run `mkcert -install`

#### Environment Configuration

The application can be configured to connect to different environments by modifying the following environment variables in your `.env` file:

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

### Production

1. Build and package for production: `yarn nx run server:package` (or `yarn build:prod`)
   - This builds both server and webapp (in production mode) and creates the deployment package at `apps/server/dist/s3/ebs.zip`
1. Start the server output from `apps/server/dist` (or build a Docker image with `yarn docker <tag>`)

**Note:** The `yarn zip` command has been deprecated. Packaging is now integrated into the build process via `yarn build:prod` or `yarn nx run server:package`.

## Testing

[![codecov](https://codecov.io/gh/wireapp/wire-webapp/branch/dev/graph/badge.svg?token=9ELBEPM793)](https://codecov.io/gh/wireapp/wire-webapp)

To launch the full suite:

`yarn nx run-many -t test --all`

Other useful tasks:

- Lint: `yarn nx run-many -t lint --all`
- Type-check: `yarn nx run-many -t type-check --all`
- E2E (Playwright): `yarn nx e2e webapp`

## CI Status

[![CI](https://github.com/wireapp/wire-webapp/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/wireapp/wire-webapp/actions/workflows/ci.yml) [![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

## Translations

All Wire translations are crowdsourced via [Crowdin](https://crowdin.com/projects/wire).

### Add new strings

**Info:**

- To download translations we use Crowdin API v1, and you need to setup your [username](https://crowdin.com/settings#account) and [api_key](https://crowdin.com/settings#api-key) (Account API key).
- To upload translations we use Crowdin CLI v3, and you will need to setup [project_identifier](https://crowdin.com/project/wire-webapp/settings#api) and [api_token](https://crowdin.com/settings#api-key) (Personal Access Token).

**Setup:**

Create a `keys/crowdin.yaml` in this repository and add the following entries:

```yaml
api_key: your-account-api-key
api_token: your-personal-access-token
project_identifier: wire-webapp
username: your-username
```

**Usage:**

1. Add string variable to "i18n/en-US.json"
2. Create a PR and merge it after approval. When the PR gets merged, our CI will take care of uploading the english texts to Crowdin.

If our CI pipeline is broken, you still have the option to upload new strings manually. For this case do the following:

1. Install [Crowdin CLI v3](https://support.crowdin.com/cli-tool/)
1. Verify you have a `keys/crowdin.yaml` in place
1. Run `yarn translate:upload`

Once translations are uploaded on Crowdin, our (and external) translators can translate the new strings on Crowdin. There is a script that will run to create PRs with translation updates. As an alternative, translations can be downloaded the following way:

1. Verify your string shows up on [Crowdin project: wire-webapp](https://crowdin.com/translate/wire-webapp/1224/en-en)
1. Add translation on Crowdin
1. Approve translation on Crowdin
1. Run `yarn translate:download`

## Contributing

Contributions are welcome! Feel free to check our [issues page](https://github.com/wireapp/wire-webapp/issues).

The following commits will help you getting started quickly with our code base:

- [Show a modal / pop-up](https://github.com/wireapp/wire-webapp/commit/00d3d120aacb3f36da80edd1ca829afc045331e9)
- [Sync setting between via backend](https://github.com/wireapp/wire-webapp/commit/3e4595a208189b7b6b51935fd2c41a74bbd16994)
