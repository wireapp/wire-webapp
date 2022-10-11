## Example

```typescript
import {BotConfig, BotCredentials, Bot} from '@wireapp/bot-api';
import {DebugHandler} from '@wireapp/bot-handler-debug';

const config: BotConfig = {
  backend: 'production',
};

const credentials: BotCredentials = {
  email: process.env.WIRE_EMAIL!,
  password: process.env.WIRE_PASSWORD!,
};

const bot = new Bot(credentials, config);
bot.addHandler(new DebugHandler());

await this.bot.start();
```
