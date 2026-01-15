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

import {Locator, Page} from 'playwright/test';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, expect, withConnectedUser, withLogin} from 'test/e2e_tests/test.fixtures';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Delete', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam}) => {
    const team = await createTeam('Test Team', {withMembers: 1});
    userA = team.owner;
    userB = team.members[0];
  });

  test(
    'I can delete my message in 1:1 and from second device',
    {tag: ['@TC-569', '@regression']},
    async ({createPage}) => {
      const deviceA = (await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB)))).webapp.pages;

      const deviceB = (await PageManager.from(createPage(withLogin(userA, {confirmNewHistory: true})))).webapp.pages;
      await deviceB.conversationList().openConversation(userB.fullName);

      await deviceA.conversation().sendMessage('Test Message');

      const messageOnDeviceA = deviceA.conversation().getMessage({sender: userA});
      await expect(messageOnDeviceA).toContainText('Test Message');

      const messageOnDeviceB = deviceB.conversation().getMessage({sender: userA});
      await expect(messageOnDeviceB).toContainText('Test Message');

      await deviceA.conversation().deleteMessage(messageOnDeviceA, 'Me');
      await expect(messageOnDeviceA).not.toBeAttached();
      await expect(messageOnDeviceB).not.toBeAttached();
    },
  );

  test('I can delete messages in group from me and others', {tag: ['@TC-570', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
    ]);

    await test.step('Create test group', async () => {
      await createGroup(userAPages, 'Test Group', [userB]);
      await userBPages.conversationList().openConversation('Test Group');
    });

    let messageA: Locator;
    let messageB: Locator;

    await test.step('Send and delete message from user A to B', async () => {
      await userAPages.conversationList().openConversation('Test Group');
      await userAPages.conversation().sendMessage('Test Message');

      messageA = userAPages.conversation().getMessage({sender: userA});
      await expect(messageA).toContainText('Test Message');

      messageB = userAPages.conversation().getMessage({sender: userA});
      await expect(messageB).toContainText('Test Message');
    });

    await test.step('Delete message and verify deletion', async () => {
      await userAPages.conversation().deleteMessage(messageA, 'Everyone');

      await expect(messageA).not.toBeAttached();
      await expect(messageB).not.toBeAttached();
    });
  });

  test(
    'I cannot delete certain types of messages (system messages)',
    {tag: ['@TC-571', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await createGroup(userAPages, 'Test Group', [userB]);
      await userBPages.conversationList().openConversation('Test Group');

      const systemMessage = userAPages.conversation().systemMessages.last();

      await systemMessage.hover();
      const messageOptions = systemMessage.getByTestId('message-actions').getByTestId('go-options');

      await expect(messageOptions).not.toBeAttached();
    },
  );

  test(
    'Deleted messages remain deleted after I archive and unarchive the conversation',
    {tag: ['@TC-572', '@regression']},
    async ({createPage}) => {
      const {components, pages} = (await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))))
        .webapp;

      let message: Locator;

      await test.step('Send and delete message', async () => {
        await pages.conversation().sendMessage('Test Message');

        message = pages.conversation().getMessage({sender: userA});
        await expect(message).toContainText('Test Message');

        await pages.conversation().deleteMessage(message, 'Me');
        await expect(message).not.toBeAttached();
      });

      await test.step('Archive conversation', async () => {
        await pages.conversationList().openContextMenu(userB.fullName);
        await pages.conversationList().archiveConversation();
      });

      await test.step('Unarchive conversation', async () => {
        await components.conversationSidebar().clickArchive();
        await pages.conversationList().clickConversationOptions(userB.fullName);
        await pages.conversationList().unarchiveConversation();
        await components.conversationSidebar().clickAllConversationsButton();
      });

      await test.step('Verify message remains deleted', async () => {
        await expect(message).not.toBeAttached();
      });
    },
  );

  test(
    'Message gets deleted even when I was offline on time of deletion',
    {tag: ['@TC-573', '@regression']},
    async ({context, createPage}) => {
      let userBPage!: Page;
      let [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(context, withLogin(userB), withConnectedUser(userA))).then(pm => {userBPage = pm.page; return pm.webapp.pages}),
      ]);

      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessage('Test Message');

      const messageA = userAPages.conversation().getMessage({sender: userA});
      await expect(messageA).toContainText('Test Message');

      const messageB = userBPages.conversation().getMessage({sender: userA});
      await expect(messageB).toContainText('Test Message');

      await userBPage.close();
      await userAPages.conversation().deleteMessage(messageA, 'Everyone');

      userBPages = (await PageManager.from(createPage(context, withLogin(userB)))).webapp.pages;
      await userBPages.conversationList().openConversation(userA.fullName);

      await expect(messageA).not.toBeAttached();
      await expect(messageB).not.toBeAttached();
    },
  );

  test(
    'I see "Deleted" status message if other user deletes their message "For Everyone" (1:1)',
    {tag: ['@TC-576', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await createGroup(userAPages, 'Test Group', [userB]);
      await userBPages.conversationList().openConversation('Test Group');

      await userAPages.conversation();

      const messageA = userAPages.conversation().getMessage({sender: userA});
      const messageB = userBPages.conversation().getMessage({sender: userA});
      await expect(messageB).toContainText('Test Message');

      await userAPages.conversation().deleteMessage(messageA, 'Everyone');

      const text = await messageB.textContent();
      await expect(messageB).not.toBeAttached();
    },
  );

  test(
    'I see "Deleted" status message if other user deletes their message "For Everyone" (group)',
    {tag: ['@TC-577', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await userAPages.conversation().sendMessage('Test Message');
      await userBPages.conversationList().openConversation(userA.fullName);

      const messageA = userAPages.conversation().getMessage({sender: userA});
      const messageB = userBPages.conversation().getMessage({sender: userA});
      await expect(messageB).toContainText('Test Message');

      await userAPages.conversation().deleteMessage(messageA, 'Everyone');

      const text = await messageB.textContent();
      await expect(messageB).not.toBeAttached();
    },
  );

  test('Delete "For Everyone" works for images', {tag: ['@TC-580', '@regression']}, async ({createPage}) => {});

  test('Delete "For Everyone" works for link preview', {tag: ['@TC-581', '@regression']}, async ({createPage}) => {});
  test(
    'Delete "For Everyone" works for location sharing',
    {tag: ['@TC-582', '@regression']},
    async ({createPage}) => {},
  );
  test('Delete "For Everyone" works for file sharing', {tag: ['@TC-583', '@regression']}, async ({createPage}) => {});
  test(
    'Dy delete "For Everyone" works for audio messages',
    {tag: ['@TC-584', '@regression']},
    async ({createPage}) => {},
  );
  test('Delete "For Everyone" works for video messages', {tag: ['@TC-585', '@regression']}, async ({createPage}) => {});
  test(
    'I see no unread count if a message was deleted from someone in a conversation',
    {tag: ['@TC-587', '@regression']},
    async ({createPage}) => {},
  );
});
