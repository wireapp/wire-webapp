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
import {ConversationListPage} from 'test/e2e_tests/pageManager/webapp/pages/conversationList.page';

test.describe('Clear Conversation Content', () => {
  let userA: User;
  let userB: User;
  let userC: User;

  test.beforeEach(async ({createTeam, createUser}, testInfo) => {
    userB = await createUser();
    userC = await createUser();
    const team = await createTeam('Test Team', {
      users: [userB, userC],
      // Only one of the test cases requires conference calling to be enabled
      features: {conferenceCalling: testInfo.tags.includes('@TC-156')},
    });
    userA = team.owner;
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
          PageManager.from(createPage(withLogin(userA))),
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
        const conversation = await userAPages.conversationList().getConversationLocator(conversationName).open();
        await userAPages.conversation().sendMessage('Message from User A');

        await userBPages.conversationList().getConversationLocator(conversationName).open();
        await userBPages.conversation().sendMessage('Message from User B');

        await userCPages.conversationList().getConversationLocator(conversationName).open();
        await userCPages.conversation().sendMessage('Message from User C');

        await expect(userAPages.conversation().messages).toHaveCount(3);

        // Step 3: User A selects 'Clear Conversation' option from the Conversation List Context Menu
        const contextMenu = await conversation.openContextMenu();
        await contextMenu.clearContentButton.click();
        // Step 4: Warning Popup should open
        await expect(userAModals.optionModal().modal).toBeVisible();

        if (type === 'clear') {
          // Step 5: User A clicks 'Clear'
          await userAModals.optionModal().clickAction();
          // Step 6: Verify that the conversation does not contain any past messages
          await conversation.open();
          await expect(userAPages.conversation().messages).toHaveCount(0);
        } else {
          // Step 5: User A clicks 'Cancel'
          await userAModals.optionModal().clickCancel();
          // Step 6: Verify that the conversation still contains any past messages
          await conversation.open();
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
        const userBPageManager = PageManager.from(await createPage(withLogin(userB)));
        const userAPageManager = PageManager.from(await createPage(withLogin(userA), withConnectedUser(userB)));

        const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
        const userBPages = userBPageManager.webapp.pages;

        // Step 1: Create a 1:1 conversation with User A and B
        const conversation = await userAPages
          .conversationList()
          .getConversationLocator(userB.fullName, {protocol: 'mls'})
          .open();

        // Step 2: Write messages in the conversation
        await userAPages.conversation().sendMessage('Message from User A');

        await userBPages.conversationList().getConversationLocator(userA.fullName, {protocol: 'mls'}).open();
        await userBPages.conversation().sendMessage('Message from User B');

        await expect(userAPages.conversation().messages).toHaveCount(2);

        // Step 3: User A selects 'Clear Conversation' option from the Conversation List Context Menu
        const contextMenu = await conversation.openContextMenu();
        await contextMenu.clearContentButton.click();
        // Step 4: Warning Popup should open
        await expect(userAModals.confirm().modal).toBeVisible();

        if (type === 'clear') {
          // Step 5: User A clicks 'Clear'
          await userAModals.confirm().clickAction();
          // Step 6: Verify that the conversation does not contain any past messages
          await conversation.open();
          await expect(userAPages.conversation().messages).toHaveCount(0);
        } else {
          // Step 5: User A clicks 'Cancel'
          await userAModals.confirm().clickCancel();
          // Step 6: Verify that the conversation still contains any past messages
          await expect(userAPages.conversation().messages).toHaveCount(2);
        }
      },
    );
  });

  [
    {tag: '@TC-156', conversationType: 'group'},
    {tag: '@TC-8779', conversationType: '1:1'},
  ].forEach(({tag, conversationType}) => {
    test(
      `I want to see incoming picture, ping and call after I clear content of a ${conversationType} conversation via conversation list`,
      {tag: [tag, '@regression']},
      async ({createPage}) => {
        const [userBPage, userCPage] = await Promise.all([createPage(withLogin(userB)), createPage(withLogin(userC))]);

        const userAPage = await createPage(withLogin(userA), withConnectedUser(userB), withConnectedUser(userC));

        const userAPageManager = PageManager.from(userAPage);
        const userBPageManager = PageManager.from(userBPage);
        const userCPageManager = PageManager.from(userCPage);

        const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
        const userBPages = userBPageManager.webapp.pages;
        const userCPages = userCPageManager.webapp.pages;

        // Step 1: Create a group conversation with User A, B and C
        const conversationName = conversationType === 'group' ? 'Group conversation' : userB.fullName;

        let userAConversation: ReturnType<ConversationListPage['getConversationLocator']>;
        if (conversationType === 'group') {
          await createGroup(userAPages, conversationName, [userB, userC]);
          userAConversation = await userAPages.conversationList().getConversationLocator(conversationName).open();
        } else {
          userAConversation = await userAPages
            .conversationList()
            .getConversationLocator(conversationName, {protocol: 'mls'})
            .open();
        }

        // Step 2: Write messages in the conversation
        await userAPages.conversation().sendMessage('Message from User A');

        const userBConversation = await userBPages
          .conversationList()
          .getConversationLocator(conversationType === 'group' ? conversationName : userA.fullName)
          .open();
        await userBPages.conversation().sendMessage('Message from User B');

        if (conversationType === 'group') {
          await userCPages.conversationList().getConversationLocator(conversationName).open();
          await userCPages.conversation().sendMessage('Message from User C');
          await expect(userAPages.conversation().messages).toHaveCount(3);
        } else {
          await expect(userAPages.conversation().messages).toHaveCount(2);
        }

        // Step 3: User A selects 'Clear Conversation' option from the Conversation List Context Menu
        const contextMenu = await userAConversation.openContextMenu();
        await contextMenu.clearContentButton.click();

        // Step 4: Warning Popup should open and User A clicks 'Clear'
        if (conversationType === 'group') {
          await expect(userAModals.optionModal().modal).toBeVisible();
          await userAModals.optionModal().clickAction();
        } else {
          await expect(userAModals.confirm().modal).toBeVisible();
          await userAModals.confirm().clickAction();
        }

        await expect(userAPages.conversation().messages).toHaveCount(0);

        // Step 5: Verify you can receive incoming new messages, pings, calls, pictures, and files
        // 5.1 Messages
        await userBConversation.open();
        await userBPages.conversation().sendMessage('Message from User B after Clear');
        await userAConversation.open();
        await expect(userAPages.conversation().messages).toHaveCount(1);

        // 5.2 Pings
        await userBConversation.open();
        await userBPages.conversation().sendPing();
        await userAConversation.open();
        await expect(userAPages.conversation().getPing()).toBeVisible();

        // 5.3 Pictures
        await shareAssetHelper(getImageFilePath(), userBPage, userBPage.getByRole('button', {name: 'Add picture'}));

        const messageWithImage = userAPages
          .conversation()
          .getMessage({sender: userB})
          .filter({has: userAPage.getByRole('img')});
        await expect(messageWithImage).toBeVisible();

        // 5.4 Files
        await userAConversation.open();
        await shareAssetHelper(getTextFilePath(), userBPage, userBPage.getByRole('button', {name: 'Add file'}));
        const messageWithFile = userAPages
          .conversation()
          .getMessage({sender: userB})
          .filter({has: userAPage.locator('[data-uie-name="file-asset"]')});
        await expect(messageWithFile).toBeVisible();

        // 5.5 Calls
        await userAConversation.open();
        await userBConversation.open();
        await userBPages.conversation().startCall();
        await expect(userAPages.calling().acceptCallButton).toBeVisible();
      },
    );
  });

  [
    {tag: '@TC-424', conversationType: 'group'},
    {tag: '@TC-425', conversationType: '1:1'},
  ].forEach(({tag, conversationType}) => {
    test(
      `I want to clear the ${conversationType} conversation content from conversation details options`,
      {tag: [tag, '@regression']},
      async ({createPage}) => {
        const userBPageManager = PageManager.from(await createPage(withLogin(userB)));
        const userAPageManager = PageManager.from(await createPage(withLogin(userA), withConnectedUser(userB)));

        const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
        const userBPages = userBPageManager.webapp.pages;

        const conversationName = 'Group conversation';
        let userAConversation: ReturnType<ConversationListPage['getConversationLocator']>;

        if (conversationType === 'group') {
          await createGroup(userAPages, conversationName, [userB]);
          // Step 1: User A and B write in group conversation
          userAConversation = await userAPages.conversationList().getConversationLocator(conversationName).open();
          await userAPages.conversation().sendMessage('Message from User A');

          await userBPages.conversationList().getConversationLocator(conversationName).open();
          await userBPages.conversation().sendMessage('Message from User B');
        } else {
          // Step 1: User A and B write in conversation
          userAConversation = await userAPages
            .conversationList()
            .getConversationLocator(userB.fullName, {protocol: 'mls'})
            .open();
          await userAPages.conversation().sendMessage('Message from User A');

          await userBPages.conversationList().getConversationLocator(userA.fullName, {protocol: 'mls'}).open();
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
          await userAConversation.open();
        } else {
          // Step 4: Clear Conversation Content Modal appears
          await expect(userAModals.confirm().modal).toBeVisible();
          // Step 5: User A clicks 'Clear'
          await userAModals.confirm().clickAction();
          // Step 6: Verify that the conversation does not contain any past messages
          await userAConversation.open();
        }
        await expect(userAPages.conversation().messages).toHaveCount(0);
      },
    );
  });
});
