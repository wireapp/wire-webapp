# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Webapp configuration

This repository tooling copies the selected webapp configuration during `npx just configure-webapp`. The command executes [`cli.mts`](./cli.mts) directly with the repository's pinned Node.js runtime; it does not compile a package first.

The tool reads [`apps/webapp/.copyconfigrc.js`](../../apps/webapp/.copyconfigrc.js), which selects the configuration repository and maps its `content/` directory to `apps/webapp/resource/` and `.env.defaults` to the repository root. Configuration version selection remains in [`apps/webapp/configuration-selection.js`](../../apps/webapp/configuration-selection.js).

The configuration file follows the [cosmiconfig format](https://github.com/cosmiconfig/cosmiconfig). The `files` option maps source paths to one or more destinations. `WIRE_CONFIGURATION_EXTERNAL_DIR`, `WIRE_CONFIGURATION_FILES`, and `WIRE_CONFIGURATION_REPOSITORY` override the corresponding options for local setup and CI.
