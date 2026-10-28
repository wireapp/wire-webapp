# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Telemetry

The Telemetry package provides utilities for tracking and logging various events and metrics within the Wire applications. It helps in monitoring the application's performance, usage patterns, and potential issues.

Under the hood uses [Countly](https://countly.com/).

### Build and watch

Run from the repository root:

```bash
npx just build-libraries
npm run start:watch # choose telemetry in the library list
npm run dev:packages # watch all development libraries
```

To watch only telemetry directly, run from `libraries/telemetry`:

```bash
node bin/copyAssets.mts
tsc --build tsconfig.json tsconfig.commonjs.json --watch --preserveWatchOutput
```

TypeScript compiles the library without bundling. The build first copies the original
`countly-sdk-web/lib/countly.min.js` byte for byte to `lib/embed.js` and writes module
format markers for the generated directories. The SDK must remain a standalone browser
script: loading it creates `window.Countly`, and `telemetry.initialize` configures it
before explicitly calling `Countly.init()`.

| Output | Purpose |
| --- | --- |
| `lib/index.js` | ESM package entry point |
| `lib/index.d.ts` | ESM declarations and legacy TypeScript `types` entry |
| `lib/commonjs/index.js` | CommonJS `require`, default export condition, and legacy `main` entry |
| `lib/commonjs/index.d.ts` | CommonJS declarations |
| `lib/embed.js` | Unmodified Countly browser SDK served by the server |

Each format also includes the compiled telemetry modules, declarations, and source maps.
Generated `package.json` files scope ESM to `lib` and CommonJS to `lib/commonjs`.
Both advertised module formats therefore work with Node and application bundlers.
The previous CommonJS export pointed to a nonexistent `lib/index.cjs`; it now points to
the generated CommonJS entry above.

Builds clean `lib` before compiling. The repository's development commands build libraries
before starting watchers. Telemetry's watch command copies assets once, then incrementally
compiles both formats without cleaning the output directory. Its build information lives
inside `lib`, so cleaning also resets incremental state. There is no TypeScript embed
source that could overwrite the SDK. The interactive `npm run start:watch` command can
select telemetry alongside the development server.

Both server build targets depend on the telemetry build. The server's asset-copy step
copies `lib/embed.js` to `libs/wire/telemetry/embed.js` in development and production
output, including the assembled deployment archive.

### Installation

```bash
npm install @wireapp/telemetry
```

### Usage

The current library implementation uses Countly as a provider. Countly provides its [JavaScript SDK](https://support.countly.com/hc/en-us/articles/360037441932-Web-analytics-JavaScript), which requires unusual implementation (asynchronous mode).

#### Embed script

To initialize the library code you have to include the `embed.js` script on you HTML page.

One way to do it is to directly copy the telemetry script into the client build directory.

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
