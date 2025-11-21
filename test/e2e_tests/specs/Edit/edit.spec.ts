/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {PageManager} from 'test/e2e_tests/pageManager';
import {test, expect, withConnectedUser, withLogin} from 'test/e2e_tests/test.fixtures';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Edit', () => {
  test(
    'I can edit my message in 1:1',
    {tag: ['@TC-679', '@regression']},
    async ({createPage, createUser, createTeamOwner}) => {
      const userB = await createUser();
      const userA = await createTeamOwner('Test Team 3', {addMembers: [userB]});

      const userAPageManager = await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB)));
      const {pages: userAPages} = userAPageManager.webapp;

      await userAPages.conversation().sendMessage('Test Message');

      const message = userAPages.conversation().getMessage({sender: userA});
      await expect(message).toContainText('Test Message');

      await userAPages.conversation().editMessage(message);
      await expect(userAPages.conversation().messageInput).toContainText('Test Message');

      // Overwrite the text in the message input and send it
      await userAPages.conversation().sendMessage('Edited Message');
      await expect(message).toContainText('Edited Message');
    },
  );

  test(
    'I can edit my message in a group conversation',
    {tag: ['@TC-680', '@regression']},
    async ({createUser, createTeamOwner, createPage}) => {
      const userB = await createUser();
      const userA = await createTeamOwner('Test Team', {addMembers: [userB]});

      const pages = (await PageManager.from(createPage(withLogin(userA)))).webapp.pages;
      await createGroup(pages, 'Test Group', [userB]);

      await pages.conversationList().openConversation('Test Group');
      await pages.conversation().sendMessage('Test Message');

      const message = pages.conversation().getMessage({sender: userA});
      await expect(message).toContainText('Test Message');

      await pages.conversation().editMessage(message);
      await expect(pages.conversation().messageInput).toContainText('Test Message');

      // Overwrite the text in the message input and send it
      await pages.conversation().sendMessage('Edited Message');
      await expect(message).toContainText('Edited Message');
    },
  );

  test(
    'I see changed message if message was edited from another device',
    {tag: ['@TC-682', '@regression']},
    async ({createTeamOwner, createUser, createPage}) => {
      const userB = await createUser();
      const userA = await createTeamOwner('Test Team', {addMembers: [userB]});

      const deviceA = (await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB)))).webapp.pages;

      // Device 2 is intentionally created after device 1 to ensure the history info warning is confirmed
      const deviceB = (await PageManager.from(createPage(withLogin(userA)))).webapp.pages;
      await deviceB.historyInfo().clickConfirmButton();
      await deviceB.conversationList().openConversation(userB.fullName);

      await deviceA.conversation().sendMessage('Message from device 1');

      const messageOnDeviceA = deviceA.conversation().getMessage({sender: userA});
      const messageOnDeviceB = deviceB.conversation().getMessage({sender: userA});
      await expect(messageOnDeviceA).toContainText('Message from device 1');
      await expect(messageOnDeviceB).toContainText('Message from device 1');

      await deviceA.conversation().editMessage(messageOnDeviceA);
      await expect(deviceA.conversation().messageInput).toContainText('Message from device 1');
      await deviceA.conversation().sendMessage('Updated message from device 1');

      await expect(messageOnDeviceA).toContainText('Updated message from device 1');
      await expect(messageOnDeviceB).toContainText('Updated message from device 1');
    },
  );

  test(
    'I cannot edit another users message',
    {tag: ['@TC-683', '@regression']},
    async ({createTeamOwner, createUser, createPage}) => {
      const userB = await createUser();
      const userA = await createTeamOwner('Test Team', {addMembers: [userB]});

      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await userAPages.conversation().sendMessage('Test Message');

      const message = userBPages.conversation().getMessage({sender: userA});
      await expect(message).toContainText('Test Message');

      const messageOptions = await userBPages.conversation().openMessageOptions(message);
      await expect(messageOptions).not.toContainText('Edit');
    },
  );

  test(
    'I can edit my last message by pressing the up arrow key',
    {tag: ['@TC-686', '@regression']},
    async ({createTeamOwner, createUser, createPage}) => {
      const userB = await createUser();
      const userA = await createTeamOwner('Test Team', {addMembers: [userB]});
      const pages = (await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB)))).webapp.pages;

      await pages.conversation().sendMessage('Test Message');
      await expect(pages.conversation().getMessage({content: 'Test Message'})).toBeVisible();

      await pages.conversation().messageInput.press('ArrowUp');
      await expect(pages.conversation().messageInput).toContainText('Test Message');
    },
  );

  test(
    'Editing a message does not create unread dot on receiver side',
    {tag: ['@TC-690', '@regression']},
    async ({createTeamOwner, createUser, createPage}) => {
      const userB = await createUser();
      const userA = await createTeamOwner('Test Team', {addMembers: [userB]});
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await test.step('Create group as second conversation', async () => {
        // We need to create a second conversation in order to switch to it to ensure the unread marker can be shown on the not open conversation
        await createGroup(userAPages, 'Test Group', [userB]);
        await userBPages.conversationList().openConversation('Test Group');
      });

      await test.step('Send message from user A to B', async () => {
        await userAPages.conversationList().openConversation(userB.fullName);
        await userAPages.conversation().sendMessage('Test Message');
      });

      await test.step('Check user B has a unread conversation with A containing the sent message', async () => {
        const conversation = userBPages.conversationList().getConversationLocator(userA.fullName);
        await expect(conversation.getByTestId('status-unread')).toBeVisible();

        await userBPages.conversationList().openConversation(userA.fullName);
        await expect(conversation).toContainText('Test Message');
        await expect(conversation.getByTestId('status-unread')).not.toBeVisible();
      });

      await test.step("Open group conversation to ensure new messages won't be read immediately", async () => {
        await userBPages.conversationList().openConversation('Test Group');
        await expect(userBPages.conversation().conversationTitle).toHaveText('Test Group');
      });

      await test.step('Change message sent by A', async () => {
        const message = userAPages.conversation().getMessage({sender: userA});
        await userAPages.conversation().editMessage(message);
        await expect(userAPages.conversation().messageInput).toContainText('Test Message');
        await userAPages.conversation().sendMessage('Edited Message');
      });

      await test.step('Check B received the updated message without marking the conversation as unread', async () => {
        const conversation = userBPages.conversationList().getConversationLocator(userA.fullName);
        await expect(conversation.getByTestId('status-unread')).not.toBeVisible();

        await userBPages.conversationList().openConversation(userA.fullName);
        await expect(userBPages.conversation().getMessage({sender: userA})).toContainText('Edited Message');
      });
    },
  );

  test(
    'I can see the changed message was edited from another user',
    {tag: ['@TC-692', '@regression']},
    async ({createTeamOwner, createUser, createPage}) => {
      const userB = await createUser();
      const userA = await createTeamOwner('Test Team', {addMembers: [userB]});
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await userAPages.conversation().sendMessage('Test');
      const sentMessage = userAPages.conversation().getMessage({sender: userA});
      await expect(sentMessage).toBeVisible();

      const receivedMessage = userBPages.conversation().getMessage({sender: userA});
      await expect(receivedMessage).toContainText('Test');

      await userAPages.conversation().editMessage(sentMessage);
      await expect(userAPages.conversation().messageInput).toContainText('Test');
      await userAPages.conversation().sendMessage('Edited');

      await expect(receivedMessage).toContainText('Edited');
    },
  );

  test(
    'I want to see the last edited text including a timestamp in message detail view if the message has been edited',
    {tag: ['@TC-3563', '@regression']},
    async ({createTeamOwner, createUser, createPage}) => {
      const userB = await createUser();
      const userA = await createTeamOwner('Test Team', {addMembers: [userB]});

      const pages = await PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages);
      await createGroup(pages, 'Test Group', [userB]); // The message detail view is only available for group conversations

      await pages.conversationList().openConversation('Test Group');
      await pages.conversation().sendMessage('Test message');

      const message = pages.conversation().getMessage({sender: userA});
      await pages.conversation().openMessageDetails(message);

      const timeEdited = pages.messageDetails().timeEdited;
      await expect(timeEdited).not.toBeAttached();

      await pages.conversation().editMessage(message);
      await expect(pages.conversation().messageInput).toContainText('Test message');
      await pages.conversation().sendMessage('Edited message');

      await expect(timeEdited).toBeVisible();
      await expect(timeEdited).toContainText(/^Edited:/);
    },
  );
});
