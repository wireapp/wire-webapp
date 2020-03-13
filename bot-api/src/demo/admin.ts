import 'dotenv-defaults/config';
import {Bot} from '../Bot';

const {CONVERSATION, EMAIL, PASSWORD, USER_ID} = process.env;

(async () => {
  const bot = new Bot({email: EMAIL!, password: PASSWORD!});
  await bot.start();
  await bot.sendText(CONVERSATION!, `Promoting user "${USER_ID}" to admin role.`);
  await bot.setAdminRole(CONVERSATION!, USER_ID!);
  process.exit(0);
})().catch(error => console.error(error));
