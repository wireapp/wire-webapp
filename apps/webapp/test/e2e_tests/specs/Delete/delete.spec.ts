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
import {ApiManagerE2E} from 'test/e2e_tests/backend/apiManager.e2e';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, expect, withConnectedUser, withLogin} from 'test/e2e_tests/test.fixtures';
import {getAudioFilePath, getTextFilePath, getVideoFilePath, shareAssetHelper} from 'test/e2e_tests/utils/asset.util';
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';
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

    await test.step('Send message from user A to B', async () => {
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
        await pages.conversationList().openConversation(userB.fullName);
        await expect(message).not.toBeAttached();
      });
    },
  );

  test(
    'Message gets deleted even when I was offline on time of deletion',
    {tag: ['@TC-573', '@regression']},
    async ({context, createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(context, withLogin(userB), withConnectedUser(userA)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      let userBPages = PageManager.from(userBPage).webapp.pages;

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessage('Test Message');

      const messageA = userAPages.conversation().getMessage({sender: userA});
      await expect(messageA).toContainText('Test Message');

      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      let messageB = userBPages.conversation().getMessage({sender: userA});
      await expect(messageB).toContainText('Test Message');

      await userBPage.close();
      await userAPages.conversation().deleteMessage(messageA, 'Everyone');

      userBPages = (await PageManager.from(createPage(context, withLogin(userB)))).webapp.pages;
      await userBPages.conversationList().openConversation(userA.fullName);

      messageB = userBPages.conversation().getMessage({sender: userA});

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

      await userAPages.conversation().sendMessage('Test Message');

      const messageA = userAPages.conversation().getMessage({sender: userA});
      const messageB = userBPages.conversation().getMessage({sender: userA});
      await expect(messageA).toContainText('Test Message');
      await expect(messageB).toContainText('Test Message');

      await userAPages.conversation().deleteMessage(messageA, 'Everyone');

      // Deletion of a message converts it to a system message with a trash can symbol
      await expect(userBPages.conversation().systemMessages.getByTitle('Deleted')).toBeAttached();

      await expect(messageB).not.toBeAttached();
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

        // Deletion of a message converts it to a system message with a trash can symbol
        await expect(userBPages.conversation().systemMessages.getByTitle('Deleted')).toBeAttached();

        await expect(messageA).not.toBeAttached();
        await expect(messageB).not.toBeAttached();
      });
    },
  );

  type SendActionParams = {
    pageA: Page;
    pageB: Page;
    api: ApiManagerE2E;
  }

  const testCases = [
    {
      name: 'images',
      tc: '@TC-580',
      sendAction: async ({pageA}: SendActionParams) => {
        await shareAssetHelper(getImageFilePath(), pageA, pageA.getByRole('button', {name: 'Add picture'}));
      },
    },
    {
      name: 'link preview',
      tc: '@TC-581',
      sendAction: async ({pageA}: SendActionParams) => {
        const userAPages = PageManager.from(pageA).webapp.pages;
        await userAPages.conversation().sendMessage('https://www.lidl.de/');
      },
    },
    {
      name: 'location sharing',
      tc: '@TC-582',
      sendAction: async ({pageB, api}: SendActionParams) => {
        const userBPages = PageManager.from(pageB).webapp.pages;

        await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

        await test.step('Prerequisite: Send location via TestService', async () => {
          const {instanceId} = await api.testService.createInstance(
            userA.password,
            userA.email,
            'Test Service Device',
            false,
          );
          const conversationId = await api.conversation.getConversationWithUser(userA.token, userB.id!);
          await api.testService.sendLocation(instanceId, conversationId, {
            locationName: 'Test Location',
            latitude: 52.5170365,
            longitude: 13.404954,
            zoom: 42,
          });
        });
      },
    },
    {
      name: 'file sharing',
      tc: '@TC-583',
      sendAction: async ({pageA}: SendActionParams) => {
        await shareAssetHelper(getTextFilePath(), pageA, pageA.getByRole('button', {name: 'Add file'}));
      },
    },
    {
      name: 'audio messages',
      tc: '@TC-584',
      sendAction: async ({pageA}: SendActionParams) => {
        await shareAssetHelper(getAudioFilePath(), pageA, pageA.getByRole('button', {name: 'Add file'}));
      },
    },
    {
      name: 'video messages',
      tc: '@TC-585',
      sendAction: async ({pageA}: SendActionParams) => {
        await shareAssetHelper(getVideoFilePath(), pageA, pageA.getByRole('button', {name: 'Add file'}));
      },
    },
  ];

  testCases.forEach(({name, tc, sendAction}) => {
    test(`Delete "For Everyone" works for ${name}`, {tag: [tc, '@regression']}, async ({createPage, api}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

      const {page: pageA} = userAPages.conversation();
      const {page: pageB} = userBPages.conversation();
      await sendAction({pageA, pageB, api});

      const messageA = userAPages.conversation().getMessage({sender: userA});
      const messageB = userBPages.conversation().getMessage({sender: userA});
      await expect(messageA).toBeAttached();
      await expect(messageB).toBeAttached();

      await userAPages.conversation().deleteMessage(messageA, 'Everyone');

      await expect(messageB).not.toBeAttached();
      await expect(messageB).not.toBeAttached();
    });
  });

  test(
    'I see no unread count if a message was deleted from someone in a conversation',
    {tag: ['@TC-587', '@regression']},
    async ({createPage}) => {
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

      await test.step('Check user B has a unread conversation with A', async () => {
        const conversation = userBPages.conversationList().getConversationLocator(userA.fullName);
        await expect(conversation.getByTestId('status-unread')).toBeVisible();
      });

      await test.step('Delete message sent by A', async () => {
        const message = userAPages.conversation().getMessage({sender: userA});
        await userAPages.conversation().deleteMessage(message, 'Everyone');
        await expect(message).not.toBeAttached();
      });

      await test.step('Check B has no unread indicator anymore', async () => {
        const conversation = userBPages.conversationList().getConversationLocator(userA.fullName);
        await expect(conversation.getByTestId('status-unread')).not.toBeVisible();

        await userBPages.conversationList().openConversation(userA.fullName);
        const message = userBPages.conversation().getMessage({sender: userA});
        await expect(message).not.toBeAttached();
      });
    },
  );
});
