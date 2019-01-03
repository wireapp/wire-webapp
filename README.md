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

## Build

### Installation

1.  Install [Node.js](https://nodejs.org/)
2.  Install [Yarn](https://yarnpkg.com): `npm install -g yarn`
3.  Run `yarn`

### Execution

Run `yarn start` and Wire's web app will be available at: http://localhost:8080/auth/#login

To login with your existing Wire account use: http://localhost:8080/auth/?env=prod#login

### Testing

To launch the full test suite (types check + linting + server tests + app tests), simply run

`yarn test`

Alternatively, you can run specific parts of the app:

`yarn test:(server|types|auth|app)`

Since the test suite for the app is the biggest test suite, you might want to run a single test file, in which case, you can use the `--specs` option:

`yarn test:app --specs spec1[,spec2...]`

where `specN` is the path to the spec to run relative to `test/unit_tests` and without `Spec.js`.

**Example**

If you want to run the tests for the `ConversationRepository`, the file containing the test is:

`test/unit_tests/conversation/ConversationRepositorySpec.js`

The command to run is:

`yarn test:app --spec conversation/ConversationRepository`

### Status

[![Build Status](https://travis-ci.org/wireapp/wire-webapp.svg?branch=dev)](https://travis-ci.org/wireapp/wire-webapp) [![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

### Translations

All Wire translations are crowdsourced via [Crowdin](https://crowdin.com/projects/wire).
