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
import {test, withLogin, withConnectedUser, expect} from 'test/e2e_tests/test.fixtures';

import {getTextFilePath, shareAssetHelper} from '../../utils/asset.util';
import {getImageFilePath} from '../../utils/sendImage.util';
import {createGroup} from '../../utils/userActions';

test.describe('Clear Conversation Content', () => {
  let userA: User;
  let userB: User;
  let userC: User;

  test.beforeEach(async ({createTeam}) => {
    const team = await createTeam('Test Team', {withMembers: 2});
    userA = team.owner;
    userB = team.members[0];
    userC = team.members[1];
  });

  [
    {tag: '@TC-152', type: 'clear'},
    {tag: '@TC-153', type: 'cancel clearing'},
  ].forEach(({tag, type}) => {
    test(
      `I want to ${type} content of a group conversation via conversation list`,
      {tag: [tag, '@regression']},
      async ({createPage}) => {
        const [userAPageManager, userBPageManager, userCPageManager] = await Promise.all([
          PageManager.from(createPage(withLogin(userA), withConnectedUser(userB), withConnectedUser(userC))),
          PageManager.from(createPage(withLogin(userB))),
          PageManager.from(createPage(withLogin(userC))),
        ]);

        const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
        const userBPages = userBPageManager.webapp.pages;
        const userCPages = userCPageManager.webapp.pages;

        // Step 1: Create a group conversation with User A, B and C
        const conversationName = 'Group conversation';
        await createGroup(userAPages, conversationName, [userB, userC]);

        // Step 2: Write messages in the group conversation
        await userAPages.conversationList().openConversation(conversationName);
        await userAPages.conversation().sendMessage('Message from User A');

        await userBPages.conversationList().openConversation(conversationName);
        await userBPages.conversation().sendMessage('Message from User B');

        await userCPages.conversationList().openConversation(conversationName);
        await userCPages.conversation().sendMessage('Message from User C');

        // Step 3: User A selects 'Clear Conversation' option from the Conversation List Context Menu
        await userAPages.conversationList().openContextMenu(conversationName);
        await userAPages.conversationList().clearContentButton.click();
        // Step 4: Warning Popup should open
        await expect(userAModals.optionModal().modal).toBeVisible();

        if (type === 'clear') {
          // Step 5: User A clicks 'Clear'
          await userAModals.optionModal().clickAction();
          // Step 6: Verify that the conversation does not contain any past messages
          await userAPages.conversationList().openConversation(conversationName);
          await expect(userAPages.conversation().messages).toHaveCount(0);
        } else {
          // Step 5: User A clicks 'Cancel'
          await userAModals.optionModal().clickCancel();
          // Step 6: Verify that the conversation does not contain any past messages
          await userAPages.conversationList().openConversation(conversationName);
          await expect(userAPages.conversation().messages).toHaveCount(3);
        }
      },
    );
  });

  [
    {tag: '@TC-154', type: 'clear'},
    {tag: '@TC-155', type: 'cancel clearing'},
  ].forEach(({tag, type}) => {
    test(
      `I want to ${type} content of 1:1 conversation via conversation list`,
      {tag: [tag, '@regression']},
      async ({createPage}) => {
        const [userAPageManager, userBPageManager] = await Promise.all([
          PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
          PageManager.from(createPage(withLogin(userB))),
        ]);

        const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
        const userBPages = userBPageManager.webapp.pages;

        // Step 1: Create a 1:1 conversation with User A and B
        await userAPages.conversationList().openConversation(userB.fullName);

        // Step 2: Write messages in the conversation
        await userAPages.conversation().sendMessage('Message from User A');

        await userBPages.conversationList().openConversation(userA.fullName);
        await userBPages.conversation().sendMessage('Message from User B');

        // Step 3: User A selects 'Clear Conversation' option from the Conversation List Context Menu
        await userAPages.conversationList().openContextMenu(userB.fullName);
        await userAPages.conversationList().clearContentButton.click();
        // Step 4: Warning Popup should open
        await expect(userAModals.confirm().modal).toBeVisible();

        if (type === 'clear') {
          // Step 5: User A clicks 'Clear'
          await userAModals.confirm().clickAction();
          // Step 6: Verify that the conversation does not contain any past messages
          await userAPages.conversationList().openConversation(userB.fullName);
          await expect(userAPages.conversation().messages).toHaveCount(0);
        } else {
          // Step 5: User A clicks 'Cancel'
          await userAModals.confirm().clickCancel();
          // Step 6: Verify that the conversation does not contain any past messages
          await expect(userAPages.conversation().messages).toHaveCount(2);
        }
      },
    );
  });

  // TODO: Blocked [WPB-22442] - Group call feature requires Enterprise Account
  test.skip(
    'I want to see incoming picture, ping and call after I clear content of a group conversation via conversation list',
    {tag: ['@TC-156', '@regression']},
    async ({createPage}) => {
      const [userAPageManager, userBPageManager, userCPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB), withConnectedUser(userC))),
        PageManager.from(createPage(withLogin(userB))),
        PageManager.from(createPage(withLogin(userC))),
      ]);

      const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
      const userBPages = userBPageManager.webapp.pages;
      const userCPages = userCPageManager.webapp.pages;

      // Step 1: Create a group conversation with User A, B and C
      const conversationName = 'Group conversation';
      await createGroup(userAPages, conversationName, [userB, userC]);

      // Step 2: Write messages in the group conversation
      await userAPages.conversationList().openConversation(conversationName);
      await userAPages.conversation().sendMessage('Message from User A');

      await userBPages.conversationList().openConversation(conversationName);
      await userBPages.conversation().sendMessage('Message from User B');

      await userCPages.conversationList().openConversation(conversationName);
      await userCPages.conversation().sendMessage('Message from User C');

      // Step 3: User A selects 'Clear Conversation' option from the Conversation List Context Menu
      await userAPages.conversationList().openContextMenu(conversationName);
      await userAPages.conversationList().clearContentButton.click();
      // Step 4: Warning Popup should open
      await expect(userAModals.optionModal().modal).toBeVisible();
      // Step 5: User A clicks 'Clear'
      await userAModals.optionModal().clickAction();

      // Step 6: Verify you can receive incoming new messages, pings, calls, pictures, and files
      // Step 6.1: Verify you can receive incoming new messages
      await userBPages.conversationList().openConversation(conversationName);
      await userBPages.conversation().sendMessage('Message from User B after Clear');
      await userAPages.conversationList().openConversation(conversationName);
      await expect(userAPages.conversation().messages).toHaveCount(1);

      // Step 6.2: Verify you can receive incoming pings
      await userBPages.conversationList().openConversation(conversationName);
      await userBPages.conversation().sendPing();
      await userAPages.conversationList().openConversation(conversationName);
      await expect(userAPages.conversation().getPing()).toBeVisible();

      // Step 6.3: Verify you can receive incoming pictures
      const {page} = userBPages.conversation();
      await shareAssetHelper(getImageFilePath(), page, page.getByRole('button', {name: 'Add picture'}));
      const messageWithImage = userAPages.conversation().getMessage({sender: userB});
      await expect(messageWithImage).toBeVisible();

      // Step 6.4: Verify you can receive incoming files
      await userAPages.conversationList().openConversation(conversationName);
      await shareAssetHelper(getTextFilePath(), page, page.getByRole('button', {name: 'Add file'}));
      const messageWithFile = userAPages.conversation().getMessage({sender: userB});
      await expect(messageWithFile).toBeVisible();

      // Step 6.5: Verify you can receive incoming calls
      await userAPages.conversationList().openConversation(conversationName);
      await userBPages.conversationList().openConversation(conversationName);
      await userBPages.conversation().startCall();
      await expect(userAPages.calling().acceptCallButton).toBeVisible();
    },
  );

  test(
    'I want to see incoming picture, ping and call after I clear content of a 1:1 conversation via conversation list',
    {tag: ['@TC-8779', '@regression']},
    async ({createPage}) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))),
      ]);

      const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
      const userBPages = userBPageManager.webapp.pages;

      // Step 1: Create a 1:1 conversation with User A and B
      await userAPages.conversationList().openConversation(userB.fullName);

      // Step 2: Write messages in the group conversation
      await userAPages.conversation().sendMessage('Message from User A');
      await userBPages.conversationList().openConversation(userA.fullName);
      await userBPages.conversation().sendMessage('Message from User B');
      await expect(userAPages.conversation().messages).toHaveCount(2);

      // Step 3: User A selects 'Clear Conversation' option from the Conversation List Context Menu
      await userAPages.conversationList().openContextMenu(userB.fullName);
      await userAPages.conversationList().clearContentButton.click();
      // Step 4: Warning Popup should open
      await expect(userAModals.confirm().modal).toBeVisible();
      // Step 5: User A clicks 'Clear'
      await userAModals.confirm().clickAction();

      // Step 6: Verify you can receive incoming new messages, pings, calls, pictures, and files
      // Step 6.1: Verify you can receive incoming new messages
      await userBPages.conversationList().openConversation(userA.fullName);
      await expect(userAPages.conversation().messages).toHaveCount(0);
      await userBPages.conversation().sendMessage('Message from User B after Clear');
      await userAPages.conversationList().openConversation(userB.fullName);
      await expect(userAPages.conversation().messages).toHaveCount(1);

      // Step 6.2: Verify you can receive incoming pings
      await userBPages.conversationList().openConversation(userA.fullName);
      await userBPages.conversation().sendPing();
      await userAPages.conversationList().openConversation(userB.fullName);
      await expect(userAPages.conversation().getPing()).toBeVisible();

      // Step 6.3: Verify you can receive incoming pictures
      const {page} = userBPages.conversation();
      await shareAssetHelper(getImageFilePath(), page, page.getByRole('button', {name: 'Add picture'}));
      const messageWithImage = userAPages
        .conversation()
        .getMessage({sender: userB})
        .filter({has: userAPages.conversation().page.locator('img[data-uie-name="image-asset-img"]')});
      await expect(messageWithImage).toBeVisible();

      // Step 6.4: Verify you can receive incoming files
      await userAPages.conversationList().openConversation(userB.fullName);
      await shareAssetHelper(getTextFilePath(), page, page.getByRole('button', {name: 'Add file'}));
      const messageWithFile = userAPages
        .conversation()
        .getMessage({sender: userB})
        .filter({
          has: userAPages.conversation().page.locator('[data-uie-name="file-asset"]'),
        });
      await expect(messageWithFile).toBeVisible();

      // Step 6.5: Verify you can receive incoming calls
      await userAPages.conversationList().openConversation(userB.fullName);
      await userBPages.conversationList().openConversation(userA.fullName);
      await userBPages.conversation().startCall();
      await expect(userAPages.calling().acceptCallButton).toBeVisible();
    },
  );

  [
    {tag: '@TC-424', type: 'clear', conversationType: 'group'},
    {tag: '@TC-425', type: 'clear', conversationType: '1:1'},
  ].forEach(({tag, type, conversationType}) => {
    test(
      `I want to ${type} the ${conversationType} conversation content from conversation details options`,
      {tag: [tag, '@regression']},
      async ({createPage}) => {
        const [userAPageManager, userBPageManager] = await Promise.all([
          PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
          PageManager.from(createPage(withLogin(userB))),
        ]);

        const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
        const userBPages = userBPageManager.webapp.pages;

        const conversationName = 'Group conversation';
        if (conversationType === 'group') {
          await createGroup(userAPages, conversationName, [userB]);
          // Step 1: User A and B write in group conversation
          await userAPages.conversationList().openConversation(conversationName);
          await userAPages.conversation().sendMessage('Message from User A');

          await userBPages.conversationList().openConversation(conversationName);
          await userBPages.conversation().sendMessage('Message from User B');
        } else {
          // Step 1: User A and B write in group conversation
          await userAPages.conversationList().openConversation(userB.fullName);
          await userAPages.conversation().sendMessage('Message from User A');

          await userBPages.conversationList().openConversation(userA.fullName);
          await userBPages.conversation().sendMessage('Message from User B');
        }
        await expect(userAPages.conversation().messages).toHaveCount(2);

        // Step 2: User A opens Conversation Details
        await userAPages.conversation().clickConversationInfoButton();
        // Step 3: User A clicks Clear Conversation Button
        await userAPages.conversationDetails().clickClearConversationContentButton();

        if (conversationType === 'group') {
          // Step 4: Clear Conversation Content Modal appears
          await expect(userAModals.optionModal().modal).toBeVisible();
          // Step 5: User A clicks 'Clear'
          await userAModals.optionModal().clickAction();
          // Step 6: Verify that the conversation does not contain any past messages
          await userAPages.conversationList().openConversation(conversationName);
        } else {
          // Step 4: Clear Conversation Content Modal appears
          await expect(userAModals.confirm().modal).toBeVisible();
          // Step 5: User A clicks 'Clear'
          await userAModals.confirm().clickAction();
          // Step 6: Verify that the conversation does not contain any past messages
          await userAPages.conversationList().openConversation(userB.fullName);
        }
        await expect(userAPages.conversation().messages).toHaveCount(0);
      },
    );
  });
});
