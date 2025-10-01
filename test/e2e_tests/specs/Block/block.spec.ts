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

import {getUser, User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {expect, test as baseTest} from 'test/e2e_tests/test.fixtures';
import {tearDownAll} from 'test/e2e_tests/utils/tearDown.util';
import {
  loginAndSetup,
  blockUserFromConversationList,
  blockUserFromOpenGroupProfileView,
  connectUsersManually,
  blockUserFromProfileView,
} from 'test/e2e_tests/utils/userActions';

import {ApiManagerE2E} from '../../backend/apiManager.e2e';
import {bootstrapTeamForTesting} from '../../utils/setup.util';

// Generating test users
let userA: User;
let userB: User;

const test = baseTest.extend<{userBPageManager: PageManager; connectUsersViaAPI: boolean}>({
  userBPageManager: async ({browser}, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const manager = PageManager.from(page);
    await use(manager);
    await context.close();
  },
  connectUsersViaAPI: [true, {option: true}],
});

test.describe('User Blocking', () => {
  test.describe('Block: User A and User B are NOT in the same team', () => {
    const setupTeamForUser = async (api: ApiManagerE2E, userToInvite: User, teamSuffix: string) => {
      let teamOwner = getUser();

      const createdOwner = await api.createTeamOwner(teamOwner, `Block Test Team ${teamSuffix}`);
      teamOwner = {...teamOwner, ...createdOwner};

      const invitationId = await api.team.inviteUserToTeam(userToInvite.email, teamOwner);
      const invitationCode = await api.brig.getTeamInvitationCodeForEmail(teamOwner.teamId, invitationId);

      await api.createPersonalUser(userToInvite, invitationCode);
    };

    test.beforeEach(
      'User A and User B are in different teams',
      async ({api, pageManager: userAPageManager, userBPageManager, connectUsersViaAPI}) => {
        userA = getUser();
        userB = getUser();

        await test.step('Preconditions: Creating separate teams for User A and User B', async () => {
          await Promise.all([setupTeamForUser(api, userA, 'A'), setupTeamForUser(api, userB, 'B')]);
        });

        if (connectUsersViaAPI) {
          await api.connectUsers(userA, userB);
        }

        await userAPageManager.openMainPage();
        await userBPageManager.openMainPage();

        await test.step('Preconditions: Signing in User A and User B', async () => {
          await Promise.all([loginAndSetup(userA, userAPageManager), loginAndSetup(userB, userBPageManager)]);
        });
      },
    );

    test.afterEach(async ({api}) => {
      await tearDownAll(api);
    });

    test(
      'I want to cancel blocking a 1on1 conversation from conversation list 0',
      {tag: ['@TC-137', '@regression']},
      async ({pageManager: userAPageManager}) => {
        const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;

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
      },
    );

    test(
      'Verify you can block a user who is not in your team',
      {tag: ['@TC-140', '@regression']},
      async ({pageManager: userAPageManager, userBPageManager}) => {
        const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
        const {pages: userBPages} = userBPageManager.webapp;

        // Step 1: User A and B have a 1:1 conversation
        await userAPages.conversationList().openConversation(userB.fullName);
        // Step 2: User A opens conversation info
        await userAPages.conversation().clickConversationInfoButton();
        // Step 3: User A clicks "Block conversation" button
        await userAPages.conversationDetails().clickBlockConversationButton();
        // Step 4: User A clicks 'Confirm' button
        await userAModals.blockWarning().clickBlock();
        // Step 5: User A cannot send message to User B
        await userAPages.conversationList().openConversation(userB.fullName);
        await expect(userAPages.conversation().messageInput).not.toBeVisible();
        // Step 6: User B cannot send message to User A
        await userBPages.conversationList().openConversation(userA.fullName);
        await userBPages.conversation().sendMessage('Message after block');
        expect(await userAPages.conversation().messageCount()).toBe(0);
        // Step 7: 'Blocked' chip is visible next to the name of User B in the conversation list
        const statusTextElement = userAPages.conversationList().blockedChip;
        await expect(statusTextElement).toBeVisible();
        await expect(statusTextElement).toHaveText('Blocked');
        // Step 8: Profile Picture of User B is replaced by 'blocked' picture
        const avatarWrapperUserB = await userAPages.conversationList().getUserAvatarWrapper(userB);
        const blockedIcon = avatarWrapperUserB.locator('[data-uie-value="blocked"]');
        await expect(blockedIcon).toBeVisible();
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

    test(
      'Verify you can unblock user from 1on1 conversation details',
      {tag: ['@TC-142', '@regression']},
      async ({pageManager: userAPageManager, userBPageManager}) => {
        const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
        const {pages: userBPages} = userBPageManager.webapp;

        // Step 1: User A and B have a 1:1 conversation
        await userAPages.conversationList().openConversation(userB.fullName);
        // Step 2: User A blocks User B
        await blockUserFromProfileView(userAPageManager, userB);
        // Step 3: User A unblocks User B from Conversation Details Options
        await userAPages.conversationList().clickConversationOptions(userB.fullName);
        await userAPages.conversationList().clickUnblockConversation();
        await userAModals.unblockWarningModal().clickUnblock();
        // Step 4: User A send message to User B
        await userAPages.conversationList().openConversation(userB.fullName);
        await userAPages.conversation().sendMessage('Message after unblock');
        // Step 5: User B receives message from User A
        await userBPages.conversationList().openConversation(userA.fullName);
        await expect(userBPages.conversation().messages).toHaveCount(1);
        // Step 6: User B writes message to User A
        await userBPages.conversation().sendMessage('Message after being unblocked');
        // Step 7: User A receives message from User B
        await userAPages.conversationList().openConversation(userB.fullName);
        await expect(userAPages.conversation().messages).toHaveCount(2);
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

    test.describe('User A and B are not in the same team and connect via UI', () => {
      test.use({connectUsersViaAPI: false});

      test(
        'Verify you can block a user you sent a connection request from conversation list 0',
        {tag: ['@TC-144', '@regression']},
        async ({pageManager: userAPageManager, userBPageManager}) => {
          const {pages: userBPages} = userBPageManager.webapp;

          // Step 1: User A sends connection request to User B
          await test.step('Preconditions: User A connects with User B', async () => {
            await connectUsersManually(userA, userB, userAPageManager, userBPageManager, false);
          });

          // Step 2: User A blocks User B from conversation list
          await blockUserFromConversationList(userAPageManager, userB);
          // Step 3: User B does not see Connection Request from User A
          expect(userBPages.conversationList()).not.toContain(userA.fullName);
        },
      );
    });

    test(
      'Verify you can unblock someone from conversation list options',
      {tag: ['@TC-148', '@regression']},
      async ({pageManager: userAPageManager, userBPageManager}) => {
        test.slow();
        const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;
        const {pages: userBPages} = userBPageManager.webapp;

        await test.step('User A blocks User B', async () => {
          await blockUserFromConversationList(userAPageManager, userB, {handleUnableToOpenModal: true});
        });

        await test.step('User A unblocks User B from Search List', async () => {
          await userAComponents.conversationSidebar().clickConnectButton();
          await userAPages.startUI().searchInput.fill(userB.username);
          await userAPages.startUI().selectUser(userB.username);
          await userAModals.userProfile().unblockButton.click();
          await userAModals.unblockWarningModal().unblockButton.click();
        });

        await test.step('User B receives message sent by User A', async () => {
          await userAPages.conversationList().openConversation(userB.fullName);
          await userAPages.conversation().sendMessage('Message after unblocking');
          await userBPages.conversationList().openConversation(userA.fullName);
          await expect(userBPages.conversation().messages).toHaveCount(1);
        });

        await test.step('User A receives message sent by User B', async () => {
          await userBPages.conversationList().openConversation(userA.fullName);
          await userBPages.conversation().sendMessage('Message after being unblocked');
          await userAPages.conversationList().openConversation(userB.fullName);
          await expect(userBPages.conversation().messages).toHaveCount(2);
        });
      },
    );
  });

  test.describe('Block: User A and User B are in the same team', () => {
    test.beforeEach('Team Test', async ({api, pageManager, browser}) => {
      userA = getUser();
      userB = getUser();
      const teamName = 'Team Name';
      const context = await browser.newContext();
      const page = await context.newPage();
      const userBPageManager = new PageManager(page);
      await bootstrapTeamForTesting(api, [userB], userA, teamName);

      await pageManager.openMainPage();
      await userBPageManager.openMainPage();

      await test.step('Preconditions: Signing in User A and User B', async () => {
        await Promise.all([loginAndSetup(userA, pageManager), loginAndSetup(userB, userBPageManager)]);
      });

      await test.step('Preconditions: User A connects with User B', async () => {
        const {pages: userAPages, components: userAComponents, modals: userAModals} = pageManager.webapp;
        await userAComponents.conversationSidebar().clickConnectButton();
        await userAPages.startUI().selectUser(userB.username);
        await userAModals.userProfile().clickStartConversation();
      });
    });

    test.afterEach(async ({api}) => {
      await tearDownAll(api);
    });

    test(
      'Verify you can not block a user from your team',
      {tag: ['@TC-8778', '@regression']},
      async ({pageManager: userAPageManager}) => {
        const {pages: userAPages} = userAPageManager.webapp;

        // Step 1: User A opens conversation with User B
        await userAPages.conversationList().openConversation(userB.fullName);

        // Step 2: User A opens the options menu for user B
        await userAPages.conversationList().clickConversationOptions(userB.fullName);

        await expect(userAPages.conversationList().blockConversationMenuButton).not.toBeAttached();
      },
    );
  });
});
