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

export {expect} from '@playwright/test';

// Generating test users
let userA: User;
let userB: User;

test.describe('Block', () => {
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
      // TODO: conversation is still present in conversationList after blocking
      await test.step('User A wants to block User B from profile view 0', async () => {
        const {pages, modals} = userAPageManager.webapp;
        // Step 1: User A opens conversation with User B
        await pages.conversationList().openConversation(userB.fullName);
        // Step 2: User A clicks on profile view 0
        await pages.conversation().clickConversationInfoButton();
        // Step 3: User wants to block User B
        await pages.participantDetails().blockUser();
        // Step 4: 'Cancel' button is visible
        await expect(modals.blockWarning().cancelButton).toBeVisible();
        // Step 5: User A blocks User B via profile view 0
        await modals.blockWarning().clickBlock();
        // Step 6: User A gets redirected back to conversation list
        // Step 7: Conversation with User B disappeared from main contact list
        // Step 8: next contact of contact list from User A is selected
      });
    },
  );

  test(
    'Verify you still receive messages from blocked person in a group chat 0',
    {tag: ['@TC-141', '@regression']},
    async ({pageManager: userAPageManager, userBPageManager}) => {
      const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;
      const conversationName = 'Groupchat with User A and User B';

      await test.step('Preconditions: Users A and B are in a group', async () => {
        await userAComponents.conversationSidebar().isPageLoaded();
        await userAPages.conversationList().clickCreateGroup();
        await userAPages.groupCreation().setGroupName(conversationName);
        await userAPages.startUI().selectUsers([userB.username]);
        await userAPages.groupCreation().clickCreateGroupButton();
      });

      // Step 1: User B sends message to group chat with User A
      await test.step('User B sends messages to group', async () => {
        await userBPages.conversationList().openConversation(conversationName);
        await userBPages.conversation().sendMessage('message before block');
      });

      // Step 2: User A blocks User B from group conversation
      await test.step('User A blocks User B from group conversation', async () => {
        await userAPages.conversation().clickConversationTitle();
        await userAPages.conversationDetails().openParticipantDetails(userB.fullName);
        await userAPages.participantDetails().blockUser();
        await userAModals.blockWarning().clickBlock();
      });

      // Step 3: User B writes second message to the group chat after being blocked by User A
      await test.step('User B sends messages to group', async () => {
        await userBPages.conversationList().openConversation(conversationName);
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
    async ({pageManager: userAPageManager, userBPageManager, api}) => {
      const {modals: userAModals, components: userAComponents, pages: userAPages} = userAPageManager.webapp;
      const {modals: userBModals, components: userBComponents, pages: userBPages} = userBPageManager.webapp;

      await test.step('Preconditions: Creating preconditions for the test via API', async () => {
        await api.createPersonalUser(userA);
        addCreatedUser(userA);

        await api.createPersonalUser(userB);
        addCreatedUser(userB);
      });

      await test.step('Preconditions: Users A and B are signed in to the application', async () => {
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

        await test.step('Preconditions: User A connects with User B', async () => {
          await userAComponents.conversationSidebar().clickConnectButton();
          await userAPages.startUI().searchInput.fill(userB.username);
          await userAPages.startUI().selectUser(userB.username);
          await userAModals.userProfile().clickConnectButton();

          expect(await userAPages.conversationList().isConversationItemVisible(userB.fullName)).toBeTruthy();
          await expect(await userBPageManager.getPage()).toHaveTitle('(1) Wire');

          await userBPages.conversationList().openPendingConnectionRequest();
          await userBPages.connectRequest().clickConnectButton();
        });
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

      // Step 2: User B blocks User A 1:1
      await test.step('User B blocks User A in 1:1 conversation', async () => {
        await userBPages.conversationList().clickConversationOptions(userA.fullName);
        await userBPages.conversationList().clickBlockConversation();
        await userBModals.blockWarning().clickBlock();
      });

      // Step 3: User A writes second message 1:1 to User B after being blocked by User B
      await test.step('User A sends messages to chat with User B', async () => {
        await userAPages.conversationList().openConversation(userB.fullName);
        await userAPages.conversation().sendMessage('message after block');
      });

      // Step 4: User B does not receive the message from User A
      await test.step('User B does not receive message from User A in 1:1', async () => {
        await userBPages.conversationList().openConversation(userA.fullName);
        expect(await userBPages.conversation().messageCount()).toBe(1);
      });

      // Step 5: User B unblocks User A
      await test.step('User B does not receive message from User A in 1:1', async () => {
        await userBPages.startUI().selectUser(userA.fullName);
      });

      // Step 6 User A sends a message to User B
      await test.step('User A sends a message to User B after getting unblocked by User B', async () => {
        await userAPages.conversationList().openConversation(userB.fullName);
        await userAPages.conversation().sendMessage('message after unblock');
      });

      // Step 4: User B unblocks User A
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
      const {pages: userBPages, modals: userBModals} = userBPageManager.webapp;
      const conversationName = 'Groupchat with User A and User B';

      // Step 1: User B blocks User A
      await test.step('User B blocks User A', async () => {
        await userBPages.conversationList().openConversation(userA.fullName);
        await userBPages.conversationList().clickConversationOptions(userA.fullName);
        await userBPages.conversationList().clickBlockConversation();
        await userBModals.blockWarning().clickBlock();
        await userBModals.unableToOpenConversation().clickAcknowledge();
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
    async ({pageManager: userAPageManager, userBPageManager, api}) => {
      const {modals: userAModals, components: userAComponents, pages: userAPages} = userAPageManager.webapp;
      const {modals: userBModals, components: userBComponents} = userBPageManager.webapp;

      await test.step('Preconditions: Creating preconditions for the test via API', async () => {
        await api.createPersonalUser(userA);
        addCreatedUser(userA);

        await api.createPersonalUser(userB);
        addCreatedUser(userB);
      });

      await test.step('Preconditions: Users A and B are signed in to the application', async () => {
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

        // Step 1: User A sends connection request to User B
        await test.step('Preconditions: User A connects with User B', async () => {
          await userAComponents.conversationSidebar().clickConnectButton();
          await userAPages.startUI().searchInput.fill(userB.username);
          await userAPages.startUI().selectUser(userB.username);
          await userAModals.userProfile().clickConnectButton();

          expect(await userAPages.conversationList().isConversationItemVisible(userB.fullName)).toBeTruthy();
          await expect(await userBPageManager.getPage()).toHaveTitle('(1) Wire');
        });
      });

      // Step 2: User A blocks User B from conversation list
      await test.step('User A blocks User B from conversation list', async () => {
        await userAPages.conversationList().openConversation(userB.fullName);
        await userAPages.conversationList().clickConversationOptions(userB.fullName);
        await userAPages.conversationList().clickBlockConversation();
        await userAModals.blockWarning().clickBlock();
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
        // Step 8: next contact of contact list from User A is selected
        // Step 9: Conversation with User A is still in Conversation List of User B
        // Step 10: No leave message is displayed
      });
    },
  );

  test(
    'Verify you can unblock someone from search list',
    {tag: ['@TC-148', '@regression']},
    async ({pageManager: userAPageManager}) => {
      test.slow();
      const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;

      await test.step('User A blocks User B', async () => {
        await userAPages.conversationList().openConversation(userB.fullName);
        await userAPages.conversationList().clickConversationOptions(userB.fullName);
        await userAPages.conversationList().clickBlockConversation();
        await userAModals.blockWarning().clickBlock();
        // if-statement is needed because in some cases the modal shows up and in some not
        // if the if-statement would be removed the test would be flaky
        if (await userAModals.unableToOpenConversation().modal.isVisible({timeout: 3000})) {
          await userAModals.unableToOpenConversation().acknowledgeButton.click();
        }
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
