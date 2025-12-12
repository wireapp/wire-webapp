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

  test(
    'I want to clear content of a group conversation via conversation list',
    {tag: ['@TC-152', '@regression']},
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
      // Step 6: Verify that the conversation does not contain any past messages
      await userAPages.conversationList().openConversation(conversationName);
      await expect(userAPages.conversation().messages).toHaveCount(0);
    },
  );

  test(
    'I want to cancel clearing content of a group conversation via conversation list',
    {tag: ['@TC-153', '@regression']},
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
      // Step 5: User A clicks 'Cancel'
      await userAModals.optionModal().clickCancel();
      // Step 6: Verify that the conversation does not contain any past messages
      await userAPages.conversationList().openConversation(conversationName);
      await expect(userAPages.conversation().messages).toHaveCount(3);
    },
  );

  test(
    'I want to clear content of 1:1 conversation via conversation list',
    {tag: ['@TC-154', '@regression']},
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
      // Step 5: User A clicks 'Clear'
      await userAModals.confirm().clickAction();
      // Step 6: Verify that the conversation does not contain any past messages
      await userAPages.conversationList().openConversation(userB.fullName);
      await expect(userAPages.conversation().messages).toHaveCount(0);
    },
  );

  test(
    'I want to cancel clearing content of 1:1 conversation via conversation list',
    {tag: ['@TC-155', '@regression']},
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
      // Step 5: User A clicks 'Cancel'
      await userAModals.confirm().clickCancel();
      // Step 6: Verify that the conversation does not contain any past messages
      await expect(userAPages.conversation().messages).toHaveCount(2);
    },
  );

  test(
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

      // Step 6.3: Verify you can receive incoming calls
      await userAPages.conversationList().openConversation(conversationName);
      await userBPages.conversationList().openConversation(conversationName);
      await userBPages.conversation().startCall();

      // Step 6.4: Verify you can receive incoming pictures
      // Step 6.5: Verify you can receive incoming files
      await userAPages.conversationList().openConversation(conversationName);
      await expect(userAPages.conversation().messages).toHaveCount(0);
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
      await userBPages.conversation().sendMessage('Message from User B after Clear');
      await userAPages.conversationList().openConversation(userB.fullName);
      await expect(userAPages.conversation().messages).toHaveCount(3);

      // Step 6.2: Verify you can receive incoming pings
      await userBPages.conversationList().openConversation(userA.fullName);
      await userBPages.conversation().sendPing();
      await userAPages.conversationList().openConversation(userB.fullName);
      await expect(userAPages.conversation().getPing()).toBeVisible();

      // Step 6.3: Verify you can receive incoming calls
      await userBPages.conversationList().openConversation(userA.fullName);

      // Step 6.4: Verify you can receive incoming pictures
      // Step 6.5: Verify you can receive incoming files
    },
  );
});
