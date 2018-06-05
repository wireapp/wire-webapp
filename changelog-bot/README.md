# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Changelog Bot

A bot used by Travis build scripts to post a changelog of the current project to Wire.

### Getting Started

```
yarn
yarn start
```

### Installation

```
yarn global add @wireapp/changelog-bot
```

### Usage

Just ask for `--help` to get informed on how to use this bot:

**Bash**

```bash
wire-changelog-bot --help
```

**Node**

```bash
yarn dist
node dist/cli.js --help
```
