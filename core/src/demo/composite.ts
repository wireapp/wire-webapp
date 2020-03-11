import {APIClient} from '@wireapp/api-client';
import {LoginData} from '@wireapp/api-client/dist/auth';
import {ClientType} from '@wireapp/api-client/dist/client';
import {Account} from '../main/Account';
import {PayloadBundleType} from '../main/conversation';

require('dotenv').config();

const args = process.argv.slice(2);
const conversationId = args[0];

if (!conversationId) {
  console.error('Please provide a conversation ID when starting this script.');
  process.exit(1);
}

const login: LoginData = {
  clientType: ClientType.TEMPORARY,
  email: process.env.WIRE_EMAIL,
  password: process.env.WIRE_PASSWORD,
};

(async () => {
  // Setup core
  const backend = process.env.WIRE_BACKEND === 'staging' ? APIClient.BACKEND.STAGING : APIClient.BACKEND.PRODUCTION;
  const apiClient = new APIClient({urls: backend});
  const account = new Account(apiClient);

  // Login account
  const {clientId, userId} = await account.login(login);
  console.info(`Hello user "${userId}" with client "${clientId}" ...`);

  // Connect to WebSocket
  await account.listen();
  account.on(PayloadBundleType.BUTTON_ACTION, data => console.info('Received button action', data));

  // Send poll message
  if (account.service) {
    const message = account.service.conversation.messageBuilder.createPollMessage(conversationId, 'Are you a robot?', [
      'Yes',
      'No',
    ]);
    await account.service.conversation.send(message);
  }
})().catch(error => console.error(error.message));
