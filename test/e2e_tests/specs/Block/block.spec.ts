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

import {expect} from '@playwright/test';

import {getUser} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {setupBasicTestScenario, startUpApp} from 'test/e2e_tests/utils/setup.util';
import {addCreatedUser, tearDownAll} from 'test/e2e_tests/utils/tearDown.util';
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {test} from '../../test.fixtures';

// Generating test data
// userB is the contact user, userA is the user who blocks
const userB = getUser();
const userA = getUser();
test.describe('Block', () => {
  test.slow();

  let owner = getUser();
  const members = Array.from({length: 2}, () => getUser());
  const [memberA] = members;
  const teamName = 'Block';

  test.beforeAll(async ({api}) => {
    const user = await setupBasicTestScenario(api, members, owner, teamName);
    owner = {...owner, ...user};
  });

  test(
    'I want to cancel blocking a 1on1 conversation from conversation list 0',
    {tag: ['@TC-137', '@regression']},
    async ({pageManager: userAPageManager, api, browser}) => {
      test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

      const {modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const userBContext = await browser.newContext();
      const userBPage = await userBContext.newPage();
      const userBPageManager = PageManager.from(userBPage);
      const {modals: userBModals, components: userBComponents} = userBPageManager.webapp;
      // const conversationName = 'Conversation with Blocked';
      // const messageText = 'second message';

      await test.step('Preconditions: Creating preconditions for the test via API', async () => {
        await api.createPersonalUser(userA);
        addCreatedUser(userA);

        await api.createPersonalUser(userB);
        addCreatedUser(userB);
      });

      await test.step('Users A and B are signed in to the application', async () => {
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

      await test.step('User A wants to cancel to block User B', async () => {
        const {pages, modals} = userAPageManager.webapp;
        // Step 1: User A opens conversation with User B
        await pages.conversationList().openConversation(userB.fullName);
        // Step 2: User A opens the options menu from conversation list for user B
        await pages.conversationList().clickConversationOptions(userB.fullName);
        // Step 3: User A opens modal and clicks 'Block' button
        await pages.conversationList().clickBlockConversation();
        // Step 4: User A clicks 'Cancel' button
        await modals.blockWarning().clickCancel();
        // Step 5: Conversation with User B is still in Conversation List of User A - User A opens conversation with User B
        await pages.conversationList().openConversation(userB.fullName);
      });
    },
  );

  test(
    'Verify you can block a person from profile view 0',
    {tag: ['@TC-140', '@regression']},
    async ({pageManager: userAPageManager, api, browser}) => {
      test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

      const {modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const userBContext = await browser.newContext();
      const userBPage = await userBContext.newPage();
      const userBPageManager = PageManager.from(userBPage);
      const {modals: userBModals, components: userBComponents} = userBPageManager.webapp;

      await test.step('Preconditions: Creating preconditions for the test via API', async () => {
        await api.createPersonalUser(userA);
        addCreatedUser(userA);

        await api.createPersonalUser(userB);
        addCreatedUser(userB);
      });

      await test.step('Users A, B and C are signed in to the application', async () => {
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
      // TODO: convo is still present in conversationList after blocking
      // TODO: blocked in relation to bug report [WPB-21052]
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
        // TODO: await expect(pages.participantDetails()).not.toBeVisible();
        // Step 7: Conversation with User B disappeared from main contact list
        // Step 8: next contact of contact list from User A is selected
      });

      /**
       *
       *  Go to 1:1 conversation
        Step 1: NULLStep 2: Step 3: Verify you are presented with  confirmation dialog  where you can cancel blocking
        Verify you are redirected back to the contact list after the person is blocked
        Verify the conversation with the blocked person disappears from the main and archived contact lists
        Verify the next list conversation is activated

        2 Open profile view

        3 Tap 'Block'
       */
    },
  );

  test(
    'Verify you still receive messages from blocked person in a group chat 0',
    {tag: ['@TC-141', '@regression']},
    async ({pageManager: userAPageManager, api, browser}) => {
      test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

      const {modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const userBContext = await browser.newContext();
      const userBPage = await userBContext.newPage();
      const userBPageManager = PageManager.from(userBPage);
      const {modals: userBModals, components: userBComponents} = userBPageManager.webapp;

      const conversationName = 'Groupchat with User A and User B';
      const messageTextBeforeBlock = 'first message';
      const messageTextAfterBlock = 'second message';

      await test.step('Preconditions: Creating preconditions for the test via API', async () => {
        await api.createPersonalUser(userA);
        addCreatedUser(userA);

        await api.createPersonalUser(userB);
        addCreatedUser(userB);
      });

      await test.step('Users A and B are signed in to the application', async () => {
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

      await test.step('Preconditions: Users A and B are in a group', async () => {
        const {pages} = userAPageManager.webapp;
        await userAComponents.conversationSidebar().isPageLoaded();
        await pages.conversationList().clickCreateGroup();
        await pages.groupCreation().setGroupName(conversationName);
        await pages.startUI().selectUsers([userB.username]);
        await pages.groupCreation().clickCreateGroupButton();
      });
      // Step 1: User B sends message to group chat with User A
      await test.step('User B sends messages to group', async () => {
        const {pages} = userBPageManager.webapp;
        await pages.conversationList().openConversation(conversationName);
        await pages.conversation().sendMessage(messageTextBeforeBlock);
      });

      // Step 2: User A blocks User B from group conversation
      await test.step('User A blocks User B from group conversation', async () => {
        const {pages} = userAPageManager.webapp;
        await pages.conversation().clickConversationTitle();
        await pages.conversationDetails().openParticipantDetails(userB.fullName);
        await pages.participantDetails().blockUser();
        await userAModals.blockWarning().clickBlock();
      });

      // Step 3: User B writes second message to the group chat after being blocked by User A
      await test.step('User B sends messages to group', async () => {
        const {pages} = userBPageManager.webapp;
        await pages.conversationList().openConversation(conversationName);
        await pages.conversation().sendMessage(messageTextAfterBlock);
      });

      // Step 4: User A receives message from User B in Group Chat even though User B is blocked
      await test.step('User A receives message in group chat', async () => {
        const {pages} = userAPageManager.webapp;
        await pages.conversationList().openConversation(conversationName);
        expect(await pages.conversation().messageCount()).toBe(2);
      });
    },
  );

  test(
    'Verify you can block and unblock user in 1on1 0',
    {tag: ['@TC-142', '@regression']},
    async ({pageManager: userAPageManager, api, browser}) => {
      test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

      const {modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const userBContext = await browser.newContext();
      const userBPage = await userBContext.newPage();
      const userBPageManager = PageManager.from(userBPage);
      const {modals: userBModals, components: userBComponents} = userBPageManager.webapp;

      const messageTextBeforeBlock = 'first message';
      const messageTextAfterBlock = 'second message';

      await test.step('Preconditions: Creating preconditions for the test via API', async () => {
        await api.createPersonalUser(userA);
        addCreatedUser(userA);

        await api.createPersonalUser(userB);
        addCreatedUser(userB);
      });

      await test.step('Users A and B are signed in to the application', async () => {
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

      // TODO: click away new-device-modal
      // Step 1: User A sends message to chat with User B
      await test.step('User A sends message 1:1 to User B', async () => {
        const {pages} = userAPageManager.webapp;
        await pages.conversationList().openConversation(userB.fullName);
        await pages.conversation().sendMessage(messageTextBeforeBlock);
      });

      // Step 2: User B receives message prior to blocking user A
      await test.step('User B receive 1:1 message from A', async () => {
        const {pages} = userBPageManager.webapp;
        await pages.conversationList().openConversation(userA.fullName);
        expect(await pages.conversation().messageCount()).toBe(1);
      });

      // Step 2: User B blocks User A 1:1
      await test.step('User B blocks User A in 1:1 conversation', async () => {
        const {pages} = userBPageManager.webapp;
        await pages.conversationList().clickConversationOptions(userA.fullName);
        await pages.conversationList().clickBlockConversation();
        await pages.participantDetails().blockUser();
        await userAModals.blockWarning().clickBlock();
      });

      // Step 3: User A writes second message 1:1 to User B after being blocked by User B
      await test.step('User A sends messages to chat with User B', async () => {
        const {pages} = userAPageManager.webapp;
        await pages.conversationList().openConversation(userB.fullName);
        await pages.conversation().sendMessage(messageTextAfterBlock);
      });

      // Step 4: User B does not receive the message from User A
      await test.step('User B does not receive message from User A in 1:1', async () => {
        const {pages} = userBPageManager.webapp;
        await pages.conversationList().openConversation(userA.fullName);
        expect(await pages.conversation().messageCount()).toBe(1);
      });

      // Step 4: User B unblocks User A
      await test.step('User B does not receive message from User A in 1:1', async () => {
        const {pages} = userBPageManager.webapp;
        await pages.conversationList().openConversation(userA.fullName);
        expect(await pages.conversation().messageCount()).toBe(1);
      });
    },
  );
  /**
   * Log in as user A and write several messages in 1:1 chat to user B
   Step 1: NULL
   Step 2: NULL
   Step 3: Verify that all messages written prior blocking were successfully received by user B
   Step 4: Verify all messages were successfully sent
   Step 5: Verify you don't get any messages/notifications from user B
   Step 6: Verify you get all the messages written by user A while he was blocked
   Step 7: Verify user B received all messages written by user A
   Step 8: Verify all messages were successfully sent
   Step 9: Verify user A successfully received all messages from user B

   2 Block a user B being logged in as user A
   3 Log in under user B
   4 Write messages to user A
   5 Log in as user A
   6 Unblock user B and write several messages to user B
   7 Log in as user B
   8 Write several messages to user A
   9 Log in as user A
   */

  test(
    'Verify you cannot add a person who blocked you to a group chat 0',
    {tag: ['@TC-143', '@regression']},
    async ({pageManager: userAPageManager, api, browser}) => {
      test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

      const {modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const userBContext = await browser.newContext();
      const userBPage = await userBContext.newPage();
      const userBPageManager = PageManager.from(userBPage);
      const {modals: userBModals, components: userBComponents} = userBPageManager.webapp;

      const conversationName = 'Groupchat with User A and User B';
      const messageTextBeforeBlock = 'first message';
      const messageTextAfterBlock = 'second message';

      await test.step('Preconditions: Creating preconditions for the test via API', async () => {
        await api.createPersonalUser(userA);
        addCreatedUser(userA);

        await api.createPersonalUser(userB);
        addCreatedUser(userB);
      });

      await test.step('Users A and B are signed in to the application', async () => {
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

      // Step 1: User B blocks User A
      await test.step('User B blocks User A', async () => {
        const {pages, modals} = userBPageManager.webapp;
        await pages.conversationList().openConversation(userA.fullName);
        await pages.conversationList().clickConversationOptions(userA.fullName);
        await pages.conversationList().clickBlockConversation();
        await modals.blockWarning().clickBlock();
        await modals.unableToOpenConversation().clickAcknowledge();
      });

      // Step 2: User A wants to add B to a group chat after being blocked by User B
      await test.step('Users A tries to add B to a group', async () => {
        const {pages} = userAPageManager.webapp;
        await userAComponents.conversationSidebar().isPageLoaded();
        await pages.conversationList().clickCreateGroup();
        await pages.groupCreation().setGroupName(conversationName);
        await pages.startUI().selectUsers([userB.username]);
        await pages.groupCreation().clickCreateGroupButton();

      });

      // Step 1: User B sends message to group chat with User A
      await test.step('User B sends messages to group', async () => {
        const {pages} = userBPageManager.webapp;
        await pages.conversationList().openConversation(conversationName);
        await pages.conversation().sendMessage(messageTextBeforeBlock);
      });

      // Step 2: User A blocks User B from group conversation
      await test.step('User A blocks User B from group conversation', async () => {
        const {pages} = userAPageManager.webapp;
        await pages.conversation().clickConversationTitle();
        await pages.conversationDetails().openParticipantDetails(userB.fullName);
        await pages.participantDetails().blockUser();
        await userAModals.blockWarning().clickBlock();
      });

      // Step 3: User B writes second message to the group chat after being blocked by User A
      await test.step('User B sends messages to group', async () => {
        const {pages} = userBPageManager.webapp;
        await pages.conversationList().openConversation(conversationName);
        await pages.conversation().sendMessage(messageTextAfterBlock);
      });

      // Step 4: User A receives message from User B in Group Chat even though User B is blocked
      await test.step('User A receives message in group chat', async () => {
        const {pages} = userAPageManager.webapp;
        await pages.conversationList().openConversation(conversationName);
        expect(await pages.conversation().messageCount()).toBe(2);
      });
    },
  );

  test(
    'Verify you can block a user you sent a connection request from conversation list 0',
    {tag: ['@TC-144', '@regression']},
    async ({pageManager: userAPageManager, api, browser}) => {
      test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

      const {modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const userBContext = await browser.newContext();
      const userBPage = await userBContext.newPage();
      const userBPageManager = PageManager.from(userBPage);
      const {modals: userBModals, components: userBComponents} = userBPageManager.webapp;

      const conversationName = 'Groupchat with User A and User B';
      const messageTextBeforeBlock = 'first message';
      const messageTextAfterBlock = 'second message';

      await test.step('Preconditions: Creating preconditions for the test via API', async () => {
        await api.createPersonalUser(userA);
        addCreatedUser(userA);

        await api.createPersonalUser(userB);
        addCreatedUser(userB);
      });

      await test.step('Users A and B are signed in to the application', async () => {
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
    },
  );

  // TODO: blocked in relation to bug report [WPB-21052]
  test(
    'Verify I can block a 1on1 conversation from conversation list 0',
    {tag: ['@TC-145', '@regression']},
    async ({pageManager: userAPageManager, api, browser}) => {
      test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

      const {modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const userBContext = await browser.newContext();
      const userBPage = await userBContext.newPage();
      const userBPageManager = PageManager.from(userBPage);
      const {modals: userBModals, components: userBComponents} = userBPageManager.webapp;

      const messageTextBeforeBlock = 'first message';
      const messageTextAfterBlock = 'second message';

      await test.step('Preconditions: Creating preconditions for the test via API', async () => {
        await api.createPersonalUser(userA);
        addCreatedUser(userA);

        await api.createPersonalUser(userB);
        addCreatedUser(userB);
      });

      await test.step('Users A and B are signed in to the application', async () => {
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

      /**
       *Create 1:1 conversation with user A and user B
      Step 1:
      Step 2:
      Step 3: A warning popup should open
      Step 4: Expect same behaviour as block:
      Verify the conversation with the blocked person disappears from the main and archived contact lists Verify the next list conversation is activated
      Step 5: Conversation should not be unarchived for user A
      Step 6: User B should still have the conversation in the list
      Step 7: No leave message is displayed

      2 User A opens the options menu from conversation list
      3 User A selects 'BLOCK' from menu
      4 User A clicks on 'Block' button on warning dialog
      5 User B sends a message
      6 Login as user B
      7 Open conversation with User A


       */
    },
  );

  test('Verify you can unblock someone from search list', {tag: ['@TC-148', '@regression']}, async ({pageManager}) => {
    // const {components, modals, pages} = pageManager.webapp;
    await startUpApp(pageManager, memberA);

    /**
     *
     */
  });

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
