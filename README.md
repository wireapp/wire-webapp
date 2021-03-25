# Wire™

[![We are hiring](https://github.com/wireapp/wire/blob/master/assets/header-small.png?raw=true)](https://wire.softgarden.io/job/616102)

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp/wire](https://github.com/wireapp/wire).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

If you compile the open source software that we make available from time to time to develop your own mobile, desktop or web application, and cause that application to connect to our servers for any purposes, we refer to that resulting application as an “Open Source App”. All Open Source Apps are subject to, and may only be used and/or commercialized in accordance with, the Terms of Use applicable to the Wire Application, which can be found at https://wire.com/legal/#terms. Additionally, if you choose to build an Open Source App, certain restrictions apply, as follows:

a. You agree not to change the way the Open Source App connects and interacts with our servers; b. You agree not to weaken any of the security features of the Open Source App; c. You agree not to use our servers to store data for purposes other than the intended and original functionality of the Open Source App; d. You acknowledge that you are solely responsible for any and all updates to your Open Source App.

For clarity, if you compile the open source software that we make available from time to time to develop your own mobile, desktop or web application, and do not cause that application to connect to our servers for any purposes, then that application will not be deemed an Open Source App and the foregoing will not apply to that application.

No license is granted to the Wire trademark and its associated logos, all of which will continue to be owned exclusively by Wire Swiss GmbH. Any use of the Wire trademark and/or its associated logos is expressly prohibited without the express prior written consent of Wire Swiss GmbH.

# How to build the open source client

Prerequisites:

1. Install [Node.js](https://nodejs.org/)
1. Install [Yarn](https://yarnpkg.com)

## 1. Fetching dependencies and configurations

1. Run `yarn`

   - This will install all dependencies and fetch a [configuration](https://github.com/wireapp/wire-web-config-wire/) for the application.

1. Rename `.env.localhost` to `.env` in order to configure the application. This configuration can override/extend the configuration from the previous step.

## 2. Build & run

### Production

1. Run `yarn build:prod`
1. Run `cd server && yarn start:prod`

### Development

1. Run `yarn start` and Wire's web app will be available at: https://localhost:8081/auth/
1. Add the following entries to your hosts file (macOS / Linux: `/etc/hosts`, Windows 10: `%WINDIR%\system32\drivers\etc\hosts`):
   - `127.0.0.1 local.wire.com` (to connect with production backend)
   - `127.0.0.1 local.zinfra.io` (to connect with staging backend)
1. Use Chrome or Firefox with the following settings:
   - custom user data directory to not mess up your usual browser configuration
     - Chrome: add `--user-data-dir=<path>` to the start parameters
     - Firefox: add `--profile <path>` to the start parameters
   - disabled [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) to circumvent issues when connecting to our backend from localhost
     - Chrome: add `--disable-web-security` to the start parameters
     - Firefox: install the [CORS Everywhere](https://addons.mozilla.org/en-US/firefox/addon/cors-everywhere/) plugin
   - disabled [`SameSite`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite) attribute to allow cross-site cookies
     - Chrome: add `--disable-features=SameSiteByDefaultCookies` to the start parameters
     - Firefox: Go to `about:config` and make sure you have the following settings:
       - `network.cookie.sameSite.laxByDefault: false`
       - `network.cookie.sameSite.noneRequiresSecure: false`
   - ignored certificate errors (optional, also see [Install the self-signed certificate](#install-the-self-signed-certificate))
     - Chrome: add `--ignore-certificate-errors` to the start parameters
     - Firefox:
       1. Go to Edit > Preferences > Privacy & Security
       2. Uncheck the checkbox for "Query OCSP responder servers to confirm the current validity of certificates"

#### Install the self-signed certificate

If you would like your browser to trust the certificate from "local.wire.com" or "local.zinfra.io":

1. Download [mkcert](https://github.com/FiloSottile/mkcert/releases/latest)
1. Set the `CAROOT` environment variable to `<WebApp Dir>/server/certificate`
1. Run `mkcert -install`

## Testing

To launch the full test suite (types check + linting + server tests + app tests), simply run:

`yarn test`

Alternatively, you can test specific parts of the app:

`yarn test:(server|types|app)`

## Deployment

### General workflow

| Stage | Branch | Action | Environment | Backend |
| :-: | :-: | :-: | :-: | :-- |
| 1 (feature development) | edge | commit | [wire-webapp-edge](https://wire-webapp-edge.zinfra.io/) | Staging |
| 2 (nightly test automation) | dev | commit or squash merge from edge | [wire-webapp-dev](https://wire-webapp-dev.zinfra.io/) | Staging |
| 3 (internal release) | dev | tag (format: `YYYY-MM-DD-staging.X`) | [wire-webapp-staging](https://wire-webapp-staging.wire.com/) | Production |
| 4 (RC testing) | master | merge (don't squash) from "dev"; afterwards [generate release notes](#release-notes) | [wire-webapp-master](https://wire-webapp-master.zinfra.io/) | Staging |
| 5 (production release) | master | tag (format: `YYYY-MM-DD-production.X`) | [wire-webapp-prod](https://app.wire.com/) | Production |

### Staging Bumps for internal releases

**Actions**

1. Get commit ID which has been approved by QA team
1. Run `yarn release:staging <commitId>` (if the commit ID is omitted, the latest commit from `dev` will be used)
1. Example:
   ```
   yarn release:staging 90fda951916f0d60a5bffce69a7267830e313391
   ```
1. Check if the commit is correct, then enter "yes"

### RC testing

Before RC testing we create a merge commit (**don't squash!**) from "dev" to "master" branch, so that our QA team can run tests on the latest version of our app.

### Production Release

Similar to "Staging Bumps" with the exception that you need to run `yarn release:production <commitId>` (if the commit ID is omitted, the latest commit from `master` will be used).

Example:

```
yarn release:production 90fda951916f0d60a5bffce69a7267830e313391
```

#### Release notes

Release notes will be automatically generated by the CI setup when releasing a production tag on GitHub. If you want to generate release notes before releasing a production version, you can run `yarn changelog:dev`, which will log all changes between the latest production release and the current development branch.

### Manual Deployments

Based on the git branch and/or tags, builds get deployed automatically by [GitHub Actions](https://github.com/wireapp/wire-webapp/actions). In case the actions are not working, a manual deployment can be triggered using `yarn deploy`.

A manual deployment requires the local setup of the Elastic Beanstalk Command Line Interface ([EB CLI](https://docs.aws.amazon.com/en_us/elasticbeanstalk/latest/dg/eb-cli3.html)). Manual deployments are also based on branch defaults which are configured [here](./.elasticbeanstalk/config.yml).

## CI Status

[![CI](https://github.com/wireapp/wire-webapp/actions/workflows/test_build_deploy.yml/badge.svg?branch=dev)](https://github.com/wireapp/wire-webapp/actions/workflows/test_build_deploy.yml) [![Lint](https://github.com/wireapp/wire-webapp/actions/workflows/lint.yml/badge.svg?branch=dev)](https://github.com/wireapp/wire-webapp/actions/workflows/lint.yml) [![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

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

1. Add string variable to "src/script/strings.ts" (source for the React part of our app) and text to "i18n/en-US.json" (source for the Knockout part of our app)
1. Create a PR and merge it after approval. When the PR gets merged, our CI will take care of uploading the english texts to Crowdin.

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
