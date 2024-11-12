# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Telemetry

The Telemetry package provides utilities for tracking and logging various events and metrics within the Wire applications. It helps in monitoring the application's performance, usage patterns, and potential issues.

Under the hood uses [Countly](https://countly.com/).

### Installation

```bash
yarn add @wireapp/telemetry
```

or

```bash
npm install @wireapp/telemetry
```

### Usage

The current library implementation uses Countly as a provider. Countly provides its [JavaScript SDK](https://support.countly.com/hc/en-us/articles/360037441932-Web-analytics-JavaScript), which requires unusual implementation (asynchronous mode).

#### Embed script

To initialize the library code you have to include the `embed.js` script on you HTML page.

One way to do it is to diretcly copy telemetry package, and store it in the client build directory.

`copy_server_assets.js`:

```js
const fs = require('fs-extra');

const distFolder = '../dist/';
const npmModulesFolder = '../../node_modules/';

fs.copySync(
  path.resolve(__dirname, npmModulesFolder, '@wireapp/telemetry/lib/embed.js'),
  path.resolve(__dirname, distFolder, 'libs/wire/telemetry/embed.js'),
);
```

`package.json`:

```json
"scripts": {
    "copy-assets": "node ./bin/copy_server_assets.js"
  },
```

`index.html`:

```html
<script src="./libs/wire/telemetry/embed.js"></script>
```

#### Initialization

```ts
import * as telemetry from '@wireapp/telemetry';

const {COUNTLY_ENABLE_LOGGING, VERSION, COUNTLY_API_KEY, COUNTLY_SERVER_URL} = Config.getConfig();

telemetry.initialize({
  appVersion: VERSION,
  provider: {
    apiKey: COUNTLY_API_KEY,
    serverUrl: COUNTLY_SERVER_URL,
    enableLogging: COUNTLY_ENABLE_LOGGING,
  },
});
```
