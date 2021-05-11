/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {APIClient} from '@wireapp/api-client';
import type {LoginData} from '@wireapp/api-client/src/auth';
import {ClientType} from '@wireapp/api-client/src/client';
import {Text} from '@wireapp/protocol-messaging';

import {Account} from '../main/Account';
import {PayloadBundleType} from '../main/conversation';
import type {ButtonActionContent, ButtonActionConfirmationContent} from '../main/conversation/content';

require('dotenv').config();

const args = process.argv.slice(2);
const conversationId = args[0] || process.env.WIRE_CONVERSATION;

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
    const buttonActionConfirmationMessage =
      account.service!.conversation.messageBuilder.createButtonActionConfirmationMessage(
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
