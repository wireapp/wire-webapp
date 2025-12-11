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

      // Step 2: Write messages in the  group conversation
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

      // Step 2: Write messages in the  group conversation
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
});
