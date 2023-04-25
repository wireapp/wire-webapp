# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## CLI Client

Command-line interface for Wire's secure messaging platform.

### Installation

```bash
npm install -g @wireapp/cli-client
```

### Usage

Type `wire-cli --help` for usage information.

#### Bash

```bash
#!/bin/bash

WIRE_LOGIN_EMAIL="yourname@email.com"
WIRE_LOGIN_PASSWORD="secret"
WIRE_CONVERSATION_ID="594f0908-b9b7-40f9-a06a-45612145e64e"

wire-cli -e "$WIRE_LOGIN_EMAIL" -p "$WIRE_LOGIN_PASSWORD" -c "$WIRE_CONVERSATION_ID"
```

#### Node.js

```bash
npx tsc && node dist/index.js -e "yourname@email.com" -p "secret" -c "594f0908-b9b7-40f9-a06a-45612145e64e"
```
