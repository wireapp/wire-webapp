# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## CopyConfig

Wire's internal configuration copy tool.


### Setup

Run `npx just configure-webapp` from the repository root. The command reads [`apps/webapp/.copyconfigrc.js`](../../apps/webapp/.copyconfigrc.js), which follows the [cosmiconfig standard](https://github.com/davidtheclark/cosmiconfig#cosmiconfig) and uses [`CopyConfigOptions.mts`](./CopyConfigOptions.mts).

**Note**: the `files` parameter needs to be specified, all other are optional.

#### Environment variables

Additionally, some parameters can be set via environment variables (which then take precedence above all other configuration):

| Parameter | Environment variable | Example |
| --- | --- | --- |
| `externalDir` | `WIRE_CONFIGURATION_EXTERNAL_DIR` | `/home/user/externalDir` |
| `files` | `WIRE_CONFIGURATION_FILES` | `/path/to/source.txt:/path/to/destination.txt;/path/to/source/:/path/to/destination/` |
| `repositoryUrl` | `WIRE_CONFIGURATION_REPOSITORY` | `/path/to/anotherDir/*:[/path/to/thirdDir/,/path/to/destinationDir/]` |

