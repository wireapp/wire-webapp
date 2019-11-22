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
import {APIClient} from '@wireapp/api-client';
import {ClientType} from '@wireapp/api-client/dist/client';
import {LoginData} from '@wireapp/api-client/dist/auth/';
import {MemoryEngine} from '@wireapp/store-engine';

const client = new APIClient({store: new MemoryEngine(), urls: APIClient.BACKEND.PRODUCTION});
const account = new Account(client);
const credentials: LoginData = {
  clientType: ClientType.TEMPORARY,
  email: 'email@wire.com',
  password: 'password',
};

account.login(credentials).then(context => {
  console.log('User ID', context.userId);
  console.log('Client ID', context.clientId);
});
```

#### Demo

- [echo.js](./src/demo/echo.js)
- [sender.js](./src/demo/sender.js)
