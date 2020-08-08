## @wireapp/bot-handler-wizard

Add a conversational UI (wizard) to a Wire bot instance.

### Demo Code

**Import**

```typescript
import {Bot} from '@wireapp/bot-api';
import {Prompt, WizardHandler} from '@wireapp/bot-handler-wizard';

// ...

const bot = new Bot(...);
bot.addHandler(new WizardHandler(...));
```

**Examples**

- [setup.ts](./src/demo/setup.ts)
