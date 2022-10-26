# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Core

Wire for Web's communication core.

### Installation

```bash
yarn add @wireapp/core
```

### Setup

```ts
import {Account} from '@wireapp/core';
import {LoginData} from '@wireapp/api-client/lib/auth/';
import {ClientType} from '@wireapp/api-client/lib/client';

const credentials: LoginData = {
  clientType: ClientType.TEMPORARY,
  email: 'email@wire.com',
  password: 'password',
};

// Login
const account = new Account();
const {userId, clientId} = await account.login(login);
console.info(`User ID "${userId}", Client ID "${clientId}"`);

// Connect to WebSocket
await account.listen();
```

### Contributing

The following commits will help you getting started quickly with the code base:

- [Recieve a Protobuf message (i.e. `ButtonAction`)](https://github.com/wireapp/wire-web-packages/commit/2a2717f8f1983d029257841232e36dd0e1fc3930)
- [Send a Protobuf message (i.e. `ButtonActionConfirmation`)](https://github.com/wireapp/wire-web-packages/commit/8bd812bed493eded0d9fd7a7ca6e8285033eb5e4)

### Demo

There are some executable examples of using the code. You can find them here:

- [./src/demo/](./src/demo)
