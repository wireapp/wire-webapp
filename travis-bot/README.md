# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Travis Bot

A bot used by Travis build scripts which posts useful messages to Wire.

### Getting Started

```
yarn install
yarn start
```

### Installation

```
yarn global add @wireapp/travis-bot
```

### Usage

* [wire-travis-bot.js](./bin/wire-travis-bot.js)

### Execution

**Bash**

```bash
#!/bin/bash

export WIRE_WEBAPP_BOT_EMAIL="<email>"
export WIRE_WEBAPP_BOT_PASSWORD="<password>"
export WIRE_WEBAPP_BOT_CONVERSATION_IDS="<conversation id>,<conversation id>"

wire-travis-bot
```

**Node**

```bash
yarn dist
bin/wire-travis-bot.js "<conversation id>,<conversation id>"
```
