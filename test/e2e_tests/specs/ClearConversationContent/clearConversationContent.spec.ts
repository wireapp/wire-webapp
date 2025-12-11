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
import {test, expect, withLogin, withConnectionRequest} from 'test/e2e_tests/test.fixtures';

test.describe('User Blocking', () => {
  test.describe('Block: User A and User B are NOT in the same team', () => {
    let userA: User;
    let userB: User;
    //let userC: User;

    test.beforeEach(async ({createTeam}) => {
      const [teamA, teamB] = await Promise.all([createTeam('Team A', {withMembers: 1}), createTeam('Team B')]);
      userA = teamA.owner;
      userB = teamB.owner;
      //userC = teamA.members[0];
    });

    test(
      'I want to cancel blocking a 1:1 conversation from conversation list',
      {tag: ['@TC-137', '@regression']},
      async ({createPage}) => {
        const userAPageManager = (await PageManager.from(createPage(withLogin(userA), withConnectionRequest(userB))))
          .webapp;
        const {pages: userAPages, modals: userAModals} = userAPageManager;

        // Preconditions: User B accepts the connection request
        const userBPages = (await PageManager.from(createPage(withLogin(userB)))).webapp.pages;
        await userBPages.connectRequest().clickConnectButton();

        // Step 1: User A opens conversation with User B
        await userAPages.conversationList().openConversation(userB.fullName);
        // Step 2: User A opens the options menu for user B
        await userAPages.conversationList().clickConversationOptions(userB.fullName);
        // Step 3: User A opens modal and clicks 'Block' button
        await userAPages.conversationList().clickBlockConversation();
        // Step 4: User A clicks 'Cancel' button
        await userAModals.blockWarning().clickCancel();
        // Step 5: Conversation is still present, and User A can open it
        await userAPages.conversationList().openConversation(userB.fullName);
        // Step 6: User A still can send message to User B
        await expect(userAPages.conversation().messageInput).toBeVisible();
      },
    );
  });
});
