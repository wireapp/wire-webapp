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
import {
  loginAndSetup,
  connectUsersManually,
  blockUserFromConversationList,
  blockUserFromProfileView,
  blockUserFromOpenGroupProfileView,
} from 'test/e2e_tests/utils/userActions';

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

  api: new ApiManagerE2E(),

  userBPageManager: async ({browser}, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const manager = PageManager.from(page);
    await use(manager);
    await context.close();
  },
});

export {expect} from '@playwright/test';

// Generating test users
let userA: User;
let userB: User;

test.describe('Block', () => {
  test.beforeEach(async ({pageManager: userAPageManager, userBPageManager, api}, testInfo) => {
    userA = getUser();
    userB = getUser();

    // Step 1: Create and log in users
    await test.step('Preconditions: Creating test users via API', async () => {
      await api.createPersonalUser(userA);
      addCreatedUser(userA);

      await api.createPersonalUser(userB);
      addCreatedUser(userB);
    });

    await test.step('Preconditions: Signing in User A and User B', async () => {
      await Promise.all([loginAndSetup(userA, userAPageManager), loginAndSetup(userB, userBPageManager)]);
    });

    // Step 2: Connect users (Conditional)
    // Skipped if '@no-setup' is present, as these tests require a manual connection
    if (!testInfo.tags.includes('@no-setup')) {
      await test.step('Preconditions: Connecting users via API', async () => {
        await api.connectUsers(userA, userB);
      });
    }
  });

  test(
    'I want to cancel blocking a 1on1 conversation from conversation list 0',
    {tag: ['@TC-137', '@regression']},
    async ({pageManager: userAPageManager}) => {
      const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;

      await test.step('User A wants to cancel to block User B', async () => {
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
      });
    },
  );

  test.fixme(
    // TODO: blocked in relation to bug report [WPB-21052]
    'Verify you can block a person from profile view 0',
    {tag: ['@TC-140', '@regression']},
    async ({pageManager: userAPageManager}) => {
      await test.step('User A wants to block User B from profile view 0', async () => {
        await blockUserFromProfileView(userAPageManager, userB);

        // TODO: Remaining steps/assertions of the test
        // Step 6: User A gets redirected back to conversation list
        // Step 7: Conversation with User B disappeared from main contact list
        // Step 8: Next contact of contact list from User A is selected
      });
    },
  );

  test(
    'Verify you still receive messages from blocked person in a group chat 0',
    {tag: ['@TC-141', '@regression']},
    async ({pageManager: userAPageManager, userBPageManager}) => {
      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;
      const conversationName = 'Groupchat with User A and User B';

      await test.step('Preconditions: Users A and B are in a group', async () => {
        await userAComponents.conversationSidebar().isPageLoaded();
        await userAPages.conversationList().clickCreateGroup();
        await userAPages.groupCreation().setGroupName(conversationName);
        await userAPages.startUI().selectUsers([userB.username]);
        await userAPages.groupCreation().clickCreateGroupButton();
        await userBPages.conversationList().openConversation(conversationName);
      });

      // Step 1: User B sends message to group chat with User A
      await test.step('User B sends messages to group', async () => {
        await userBPages.conversation().sendMessage('message before block');
      });

      // Step 2: User A blocks User B from group conversation
      await test.step('User A blocks User B from group conversation', async () => {
        // Ensures User A is in the group before blocking
        await userAPages.conversationList().openConversation(conversationName);
        await blockUserFromOpenGroupProfileView(userAPageManager, userB);
      });

      // Step 3: User B writes second message to the group chat after being blocked by User A
      await test.step('User B sends messages to group', async () => {
        await userBPages.conversation().sendMessage('message after block');
      });

      // Step 4: User A receives message from User B in Group Chat even though User B is blocked
      await test.step('User A receives message in group chat', async () => {
        await userAPages.conversationList().openConversation(conversationName);
        expect(await userAPages.conversation().messageCount()).toBe(2);
      });
    },
  );

  test.fixme(
    // TODO: Bug [WPB-18226] Message is not visible in the conversation after sending it
    'Verify you can block and unblock user in 1on1 0',
    {tag: ['@TC-142', '@regression', '@no-setup']}, // @no-setup because otherwise 'New Device Modal' modal will show up which you cannot click away
    async ({pageManager: userAPageManager, userBPageManager}) => {
      const {pages: userAPages} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;

      await test.step('Preconditions: User A connects with User B', async () => {
        await connectUsersManually(userA, userB, userAPageManager, userBPageManager);
      });

      // Step 1: User A sends message to chat with User B
      await test.step('User A sends message 1:1 to User B', async () => {
        await userAPages.conversationList().openConversation(userB.fullName);
        await userAPages.conversation().sendMessage('message before block');
      });

      // Step 2: User B receives message prior to blocking user A
      await test.step('User B receive 1:1 message from A', async () => {
        await userBPages.conversationList().openConversation(userA.fullName);
        expect(await userBPages.conversation().messageCount()).toBe(1);
      });

      // Step 3: User B blocks User A 1:1
      await test.step('User B blocks User A in 1:1 conversation', async () => {
        await blockUserFromConversationList(userBPageManager, userA);
      });

      // Step 4: User A writes second message 1:1 to User B after being blocked by User B
      await test.step('User A sends messages to chat with User B', async () => {
        await userAPages.conversationList().openConversation(userB.fullName);
        await userAPages.conversation().sendMessage('message after block');
      });

      // Step 5: User B does not receive the message from User A
      await test.step('User B does not receive message from User A in 1:1', async () => {
        await userBPages.conversationList().openConversation(userA.fullName);
        expect(await userBPages.conversation().messageCount()).toBe(1);
      });

      // Step 6: User B unblocks User A
      await test.step('User B does not receive message from User A in 1:1', async () => {
        await userBPages.startUI().selectUser(userA.fullName);
      });

      // Step 7: User A sends a message to User B
      await test.step('User A sends a message to User B after getting unblocked by User B', async () => {
        await userAPages.conversationList().openConversation(userB.fullName);
        await userAPages.conversation().sendMessage('message after unblock');
      });

      // Step 8: User B unblocks User A
      await test.step('User B receives message from User A in 1:1', async () => {
        await userBPages.conversationList().openConversation(userA.fullName);
        expect(await userBPages.conversation().messageCount()).toBe(2);
      });
    },
  );

  test(
    'Verify you cannot add a person who blocked you to a group chat 0',
    {tag: ['@TC-143', '@regression']},
    async ({pageManager: userAPageManager, userBPageManager}) => {
      const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const conversationName = 'Groupchat with User A and User B';

      // Step 1: User B blocks User A
      await test.step('User B blocks User A', async () => {
        await blockUserFromConversationList(userBPageManager, userA, {handleUnableToOpenModal: true});
      });

      // Step 2: User A wants to add B to a group chat after being blocked by User B
      await test.step('Users A tries to add B to a group', async () => {
        await userAComponents.conversationSidebar().isPageLoaded();
        await userAPages.conversationList().clickCreateGroup();
        await userAPages.groupCreation().setGroupName(conversationName);
        await userAPages.startUI().selectUsers([userB.username]);
        await userAPages.groupCreation().clickCreateGroupButton();

        // Step 3: Modal 'modalConversationNotConnectedMessageOne' is visible
        expect(userAModals.conversationNotConnected().isModalPresent()).toBeTruthy();
      });
    },
  );

  test(
    'Verify you can block a user you sent a connection request from conversation list 0',
    {tag: ['@TC-144', '@regression', '@no-setup']}, // @no-setup because connection request must be sent manually to satisfy test specs
    async ({pageManager: userAPageManager, userBPageManager}) => {
      // Step 1: User A sends connection request to User B
      await test.step('Preconditions: User A connects with User B', async () => {
        await connectUsersManually(userA, userB, userAPageManager, userBPageManager);
      });

      // Step 2: User A blocks User B from conversation list
      await test.step('User A blocks User B from conversation list', async () => {
        await blockUserFromConversationList(userAPageManager, userB);
      });
    },
  );

  // TODO: blocked in relation to bug report [WPB-21052]
  // TODO: conversation is still present in conversationList after blocking
  test.fixme(
    'Verify I can block a 1on1 conversation from conversation list 0',
    {tag: ['@TC-145', '@regression']},
    async ({pageManager: userAPageManager}) => {
      const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;

      await test.step('User A wants to block User B', async () => {
        // Step 1: User A opens conversation with User B
        await userAPages.conversationList().openConversation(userB.fullName);
        // Step 2: User A opens the options menu for user B
        await userAPages.conversationList().clickConversationOptions(userB.fullName);
        // Step 3: User A opens modal and clicks 'Block' button
        await userAPages.conversationList().clickBlockConversation();
        // Step 4: Block Modal is visible
        expect(userAModals.blockWarning().isModalPresent()).toBeTruthy();
        // Step 5: User A blocks User B
        await userAModals.blockWarning().clickBlock();
        // [Unwanted/current behavior] Conversation is still present, and User A can open it
        await userAPages.conversationList().openConversation(userB.fullName);
        // Step 6: User A gets redirected back to conversation list
        // Step 7: Conversation with User B disappeared from main contact list of User A
        // Step 8: Conversation with User B disappeared from archive list of User A
        // Step 8: Next contact of contact list from User A is selected
        // Step 9: Conversation with User A is still in Conversation List of User B
        // Step 10: No leave message is displayed
      });
    },
  );

  test(
    'Verify you can unblock someone from search list',
    {tag: ['@TC-148', '@regression']},
    async ({pageManager: userAPageManager}) => {
      const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;

      await test.step('User A blocks User B', async () => {
        // The 'handleUnableToOpenModal' option takes care of optional modal
        await blockUserFromConversationList(userAPageManager, userB, {handleUnableToOpenModal: true});
      });

      await test.step('User A unblocks User B from Search List', async () => {
        await userAComponents.conversationSidebar().clickConnectButton();
        await userAPages.startUI().searchInput.fill(userB.username);
        await userAPages.startUI().selectUser(userB.username);
        await userAModals.userProfile().unblockButton.click();
      });
    },
  );

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
