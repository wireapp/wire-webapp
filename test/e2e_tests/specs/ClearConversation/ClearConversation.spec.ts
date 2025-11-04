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

import {test as base, expect} from '@playwright/test';

import {getUser, User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {addCreatedUser, tearDownAll} from 'test/e2e_tests/utils/tearDown.util';
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {ApiManagerE2E} from '../../backend/apiManager.e2e';

type testcaseFixtures = {
  pageManager: PageManager;
  api: ApiManagerE2E;
  userBPageManager: PageManager;
};

export const test = base.extend<testcaseFixtures>({
  pageManager: async ({page}, use) => {
    await use(PageManager.from(page));
  },

  api: async ({}, use) => {
    await use(new ApiManagerE2E());
  },

  userBPageManager: async ({browser}, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const manager = PageManager.from(page);
    await use(manager);
    await context.close();
  },
});

// Generating test users
let userA: User;
let userB: User;

test.describe('Clear Conversation', () => {
  test.beforeEach(async ({pageManager: userAPageManager, userBPageManager, api}, testInfo) => {
    userA = getUser();
    userB = getUser();

    if (testInfo.tags.includes('@no-setup')) {
      return;
    }
    // Create the users
    await test.step('Preconditions: Creating test users via API', async () => {
      await api.createPersonalUser(userA);
      addCreatedUser(userA);

      await api.createPersonalUser(userB);
      addCreatedUser(userB);
    });

    // Login users
    await test.step('Preconditions: Signing in User A and User B', async () => {
      const {modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const {modals: userBModals, components: userBComponents} = userBPageManager.webapp;

      await Promise.all([
        (async () => {
          await userAPageManager.openMainPage();
          await loginUser(userA, userAPageManager);
          await userAModals.dataShareConsent().clickDecline();
          await userAComponents.conversationSidebar().isPageLoaded();
        })(),
        (async () => {
          await userBPageManager.openMainPage();
          await loginUser(userB, userBPageManager);
          await userBModals.dataShareConsent().clickDecline();
          await userBComponents.conversationSidebar().isPageLoaded();
        })(),
      ]);

      await api.connectUsers(userA, userB);
    });
  });

  test.fixme(
    'I want to clear content of a group conversation via conversation list 0',
    {tag: ['@TC-152', '@regression']},
    async ({pageManager: userAPageManager, userBPageManager}) => {
      const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;
      const conversationName = 'Groupchat with User A and User B';

      await test.step('Preconditions: Users A and B are in a group and each user sends a message to the group', async () => {
        await userAComponents.conversationSidebar().isPageLoaded();
        await userAPages.conversationList().clickCreateGroup();
        await userAPages.groupCreation().setGroupName(conversationName);
        await userAPages.startUI().selectUsers([userB.username]);
        await userAPages.groupCreation().clickCreateGroupButton();
        await userAPages.conversationList().openConversation(conversationName);
        await userAPages.conversation().sendMessage('Message before clearing group conversation');
        await userBPages.conversationList().openConversation(conversationName);
        await userBPages.conversation().sendMessage('Message from User B before User A clears group conversation');
      });

      await test.step('User A wants to clear content of group conversation', async () => {
        expect(await userAPages.conversationList().isConversationItemVisible(conversationName)).toBeTruthy();
        // Step 1: User A opens the options menu from conversation list
        await userAPages.conversationList().clickConversationOptions(conversationName);
        // Step 2: User A selects 'DELETE' from menu
        await userAPages.conversationList().clearContent();
        // Step 3: User clicks on 'DELETE' button from warning dialog
        await userAModals.clearContent().actionButton.click();
        // TODO: Bug [WPB-21523] Group Conversation is still present in conversation list after clearing its content
        // Step 4: Conversation is removed from list
        expect(await userAPages.conversationList().isConversationItemVisible(conversationName)).toBeFalsy();
        // Step 5: User A searches for conversation
        await userAPages.conversationList().searchConversation(conversationName);
        // Step 6: User A sees zero group messages
        expect(await userAPages.conversation().messageCount()).toBe(0);
        // Step 7: User B sends a message to group conversation
        await userBPages.conversationList().openConversation(conversationName);
        await userBPages.conversation().sendMessage('Message from User B after User A clears group conversation');
        // Step 8: User B should see three messages
        expect(await userBPages.conversation().messageCount()).toBe(3);
        // Step 9: User A should see one message
        expect(await userAPages.conversation().messageCount()).toBe(1);
      });
    },
  );

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
