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

import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, expect, withLogin, withConnectedUser} from 'test/e2e_tests/test.fixtures';
import {getAudioFilePath, getTextFilePath, getVideoFilePath, shareAssetHelper} from 'test/e2e_tests/utils/asset.util';
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';
import {createGroup} from '../../utils/userActions';

test.describe('Read Receipts', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    const team = await createTeam('Test Team', {users: [userB]});
    userA = team.owner;
  });

  const assetTestCases = [
    {description: 'assets: picture', tag: '@TC-3552'},
    {description: 'assets: audio', tag: '@TC-3553'},
    {description: 'assets: video', tag: '@TC-3554'},
    {description: 'assets: file', tag: '@TC-3555'},
    {description: 'assets: link preview', tag: '@TC-3557'},
    {description: 'ephemeral message', tag: '@TC-3562'},
  ];

  for (const {description, tag} of assetTestCases) {
    test(`I want to see read receipts for ${description}`, {tag: [tag, '@regression']}, async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);

      const {pages: userAPages, components: userAComponents} = PageManager.from(userAPage).webapp;
      const {pages: userBPages, components: userBComponents} = PageManager.from(userBPage).webapp;

      // Preconditions: User A and User B have read receipts turned on
      await userAComponents.conversationSidebar().preferencesButton.click();
      await userAPages.account().readReceiptsCheckbox.click();
      await userAComponents.conversationSidebar().allConversationsButton.click();

      await userBComponents.conversationSidebar().preferencesButton.click();
      await userBPages.account().readReceiptsCheckbox.click();
      await userBComponents.conversationSidebar().allConversationsButton.click();

      const conversationName = 'Group Conversation';
      await createGroup(userAPages, conversationName, [userB]);
      await userAPages.conversationList().getConversation(conversationName).open();

      await userBPages.conversationList().getConversation(userA.fullName, {protocol: 'mls'}).open();

      switch (tag) {
        case '@TC-3552':
          await shareAssetHelper(getImageFilePath(), userBPage, userBPage.getByRole('button', {name: 'Add picture'}));
          break;
        case '@TC-3553':
          await shareAssetHelper(getAudioFilePath(), userBPage, userBPage.getByRole('button', {name: 'Add file'}));
          break;
        case '@TC-3554':
          await shareAssetHelper(getVideoFilePath(), userBPage, userBPage.getByRole('button', {name: 'Add file'}));
          break;
        case '@TC-3555':
          await shareAssetHelper(getTextFilePath(), userBPage, userBPage.getByRole('button', {name: 'Add file'}));
          break;
        case '@TC-3557':
          await userBPages
            .conversation()
            .sendMessage('Message with Link Preview: https://www.youtube.com/watch?v=dQw4w9WgXcQ');
          break;
        case '@TC-3562':
          await userBPages.conversation().enableSelfDeletingMessages();
          await userBPages.conversation().sendMessage('Ephemeral Message');
          break;
      }

      await userAPages.conversationList().getConversation(userB.fullName, {protocol: 'mls'}).open();

      const receivedMessage = userAPages.conversation().getMessage({sender: userB});
      await expect(receivedMessage).toBeVisible();

      const messageWithReadReceipt = userBPages.conversation().getMessage({sender: userB});
      await expect(await userBPages.conversation().getMessageReadReceipt(messageWithReadReceipt)).toBeVisible();
    });
  }

  // TODO: [WPB-25618] read receipt is not visible on location share
  // TODO: unskip this test when Bug Ticket [WPB-25618] is resolved
  test.skip(
    'I want to see read receipts for assets: location',
    {tag: ['@TC-3556', '@regression']},
    async ({createPage, api}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);

      const {pages: userAPages, components: userAComponents} = PageManager.from(userAPage).webapp;
      const {pages: userBPages, components: userBComponents} = PageManager.from(userBPage).webapp;

      // Preconditions: User A and User B have read receipts turned on
      await userAComponents.conversationSidebar().preferencesButton.click();
      await userAPages.account().readReceiptsCheckbox.click();
      await userAComponents.conversationSidebar().allConversationsButton.click();

      await userBComponents.conversationSidebar().preferencesButton.click();
      await userBPages.account().readReceiptsCheckbox.click();
      await userBComponents.conversationSidebar().allConversationsButton.click();

      const conversationName = 'Group Conversation';
      await createGroup(userAPages, conversationName, [userB]);
      await userAPages.conversationList().getConversation(conversationName).open();

      await userBPages.conversationList().getConversation(userA.fullName, {protocol: 'mls'}).open();

      await test.step('Prerequisite: Send location via TestService', async () => {
        const {instanceId} = await api.testService.createInstance(
          userB.password,
          userB.email,
          'Test Service Device',
          false,
        );
        const conversationId = await api.conversation.getConversationWithUser(userB.token, userA.id!);
        if (conversationId === undefined) throw new Error("Couldn't find conversation of userA with userB");
        await api.testService.sendLocation(instanceId, conversationId, {
          locationName: 'Test Location',
          latitude: 52.5170365,
          longitude: 13.404954,
          zoom: 42,
        });
      });

      const conversationWithUserB = userAPages.conversationList().getConversation(userB.fullName, {protocol: 'mls'});
      await expect(conversationWithUserB.unreadIndicator).toBeVisible();
      await conversationWithUserB.open();

      const messageWithLocationShare = userAPages.conversation().getMessage({sender: userB});
      await expect(messageWithLocationShare).toBeVisible();

      const messageWithReadReceipt = userBPages.conversation().getMessage({sender: userB});
      await expect(await userBPages.conversation().getMessageReadReceipt(messageWithReadReceipt)).toBeVisible();
    },
  );

  test(
    'I want to see a popup when I toggled read receipts on and off from another device',
    {tag: ['@TC-3567', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);

      const userAPage2 = await createPage(withLogin(userA, {confirmNewHistory: true}));

      const {pages: userAPages, modals: userAModals, components: userAComponents} = PageManager.from(userAPage).webapp;
      const {pages: userAPages2, components: userAComponents2} = PageManager.from(userAPage2).webapp;
      const {pages: userBPages, components: userBComponents} = PageManager.from(userBPage).webapp;

      // Preconditions: User B has read receipts turned on
      await userBComponents.conversationSidebar().preferencesButton.click();
      await userBPages.account().readReceiptsCheckbox.click();
      await userBComponents.conversationSidebar().allConversationsButton.click();

      // User A turns on read receipts on second device
      await userAComponents2.conversationSidebar().preferencesButton.click();
      await userAPages2.account().readReceiptsCheckbox.click();
      await userAComponents2.conversationSidebar().allConversationsButton.click();

      // User A sees the modal about read receipts being enabled
      await userAComponents.conversationSidebar().preferencesButton.click();
      await expect(userAModals.newDevice().modal).toBeVisible();
      await userAModals.newDevice().actionButton.click();

      // to see the enabled read receipt modal, User A needs to switch to another settings tab
      await userAPages.settings().devicesButton.click();
      await expect(userAModals.readReceipt().modal).toBeVisible();
    },
  );
});
