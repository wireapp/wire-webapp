# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## API Client

Wire for Web's API client.

### Getting Started

```bash
yarn
yarn start
```

### Installation

```bash
yarn add @wireapp/api-client
```

### Usage

**Browser**

- [index.html](index.html)

**Node.js**

- [demo.ts](demo.ts)

### Execution

**Bash**

```bash
#!/bin/bash

EMAIL="name@email.com"
PASSWORD="password"

node index.js --e="$EMAIL" --p="$PASSWORD"
```

**Node**

```bash
npm run dist
node index.js --e="name@email.com" --p="password"
```
