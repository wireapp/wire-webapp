# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Core

Wire for Web's communication core.

### Example

```javascript
const {Account} = require('@wireapp/core');

const bot = new Account({
  email: 'me@wire.com',
  password: 'top-secret',
});

bot.on(Account.INCOMING.TEXT_MESSAGE, ({conversation, content}) => {
  bot.sendTextMessage(conversation, `You wrote: ${content}`);
});

bot.listen();
```
