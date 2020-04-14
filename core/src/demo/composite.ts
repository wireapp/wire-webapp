import {APIClient} from '@wireapp/api-client';
import {LoginData} from '@wireapp/api-client/dist/auth';
import {ClientType} from '@wireapp/api-client/dist/client';
import {Account} from '../main/Account';
import {PayloadBundleType} from '../main/conversation';
import {ButtonActionContent, ButtonActionConfirmationContent} from '../main/conversation/content';
import {Text} from '@wireapp/protocol-messaging';

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

  account.on(PayloadBundleType.BUTTON_ACTION, async buttonActionMessage => {
    // Send button action confirmation
    const {conversation, from} = buttonActionMessage;
    const {
      content: {buttonId, referenceMessageId},
    } = buttonActionMessage;

    const buttonActionConfirmationContent: ButtonActionConfirmationContent = {
      buttonId,
      referenceMessageId,
    };
    const buttonActionConfirmationMessage = account.service!.conversation.messageBuilder.createButtonActionConfirmationMessage(
      conversation,
      buttonActionConfirmationContent,
    );
    await account.service!.conversation.send(buttonActionConfirmationMessage, [from]);

    console.info(
      `Confirmed button click on "${buttonId}" for poll "${referenceMessageId}" by user "${from}" in conversation "${conversation}".`,
    );
  });

  if (account.service) {
    // Send poll
    const pollMessage = account.service.conversation.messageBuilder
      .createComposite(conversationId)
      .addText(Text.create({content: 'Are you a robot?'}))
      .addButton('Yes')
      .addButton('No')
      .build();

    await account.service.conversation.send(pollMessage);

    // Send button action
    const buttonItems = pollMessage.content.items!.filter(item => typeof item.button === 'object');
    const lastButton = buttonItems[buttonItems.length - 1].button;
    const buttonActionContent: ButtonActionContent = {
      buttonId: lastButton!.id,
      referenceMessageId: pollMessage.id,
    };
    const buttonActionMessage = account.service.conversation.messageBuilder.createButtonActionMessage(
      conversationId,
      buttonActionContent,
    );
    await account.service.conversation.send(buttonActionMessage);
  }
})().catch(error => console.error('Error', error.message));
