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
import {test, expect, withLogin, withConnectionRequest, withConnectedUser} from 'test/e2e_tests/test.fixtures';

import {createGroup} from '../../utils/userActions';

/* ========== Block Utils ========== */
/**
 * Blocks a user from the conversation list
 * @param pageManager PageManager of the blocking user
 * @param userToBlock User object of the user to be blocked
 */
export async function blockUserFromConversationList(pageManager: PageManager, userToBlock: User) {
  const {pages, modals} = pageManager.webapp;

  await pages.conversationList().openConversation(userToBlock.fullName);
  await pages.conversationList().clickConversationOptions(userToBlock.fullName);
  await pages.conversationList().clickBlockConversation();
  await modals.blockWarning().clickBlock();
}

/**
 * Blocks a user from their profile view (from a 1:1 conversation)
 * @param pageManager PageManager of the blocking user
 * @param userToBlock User object of the user to be blocked
 */
export async function blockUserFromProfileView(pageManager: PageManager, userToBlock: User) {
  const {pages, modals} = pageManager.webapp;
  await pages.conversationList().openConversation(userToBlock.fullName);
  await pages.conversation().clickConversationInfoButton();
  await pages.participantDetails().blockUser();
  await modals.blockWarning().clickBlock();
}

/**
 * Blocks a user via the participant details in a group chat
 * Assumes that the group conversation is already open
 * @param pageManager PageManager of the blocking user
 * @param userToBlock User object of the user to be blocked
 */
export async function blockUserFromOpenGroupProfileView(pageManager: PageManager, userToBlock: User) {
  const {pages, modals} = pageManager.webapp;
  await pages.conversation().clickConversationTitle();
  await pages.conversationDetails().openParticipantDetails(userToBlock.fullName);
  await pages.participantDetails().blockUser();
  await modals.blockWarning().clickBlock();
}

/* ==================================== */

test.describe('User Blocking', () => {
  test.describe('Block: User A and User B are NOT in the same team', () => {
    let userA: User;
    let userB: User;
    let userC: User;

    test.beforeEach(async ({createTeam}) => {
      const [teamA, teamB] = await Promise.all([createTeam('Team A', {withMembers: 1}), createTeam('Team B')]);
      userA = teamA.owner;
      userB = teamB.owner;
      userC = teamA.members[0];
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

    test(
      'Verify you can block a user who is not in your team',
      {tag: ['@TC-140', '@regression']},
      async ({createPage}) => {
        const userAPageManager = (await PageManager.from(createPage(withLogin(userA), withConnectionRequest(userB))))
          .webapp;
        const {pages: userAPages, modals: userAModals} = userAPageManager;

        // Preconditions: User B accepts the connection request
        const userBPages = (await PageManager.from(createPage(withLogin(userB)))).webapp.pages;
        await userBPages.connectRequest().clickConnectButton();

        // Step 1: User A and B have a 1:1 conversation
        await userAPages.conversationList().openConversation(userB.fullName);
        // Step 2: User A opens conversation info
        await userAPages.conversation().clickConversationInfoButton();
        // Step 3: User A clicks 'Block conversation' button
        await userAPages.conversationDetails().clickBlockConversationButton();
        // Step 4: User A clicks 'Confirm' button
        await userAModals.blockWarning().clickBlock();
        // Step 5: User A cannot send message to User B
        await userAPages.conversationList().openConversation(userB.fullName);
        await expect(userAPages.conversation().messageInput).not.toBeVisible();
        // Step 6: User B cannot send message to User A
        await userBPages.conversationList().openConversation(userA.fullName);
        await userBPages.conversation().sendMessage('Message after block');
        const message = userAPages.conversation().getMessage({sender: userB});
        await expect(message).not.toBeVisible();
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
      'Verify you still receive messages from blocked person in a group chat',
      {tag: ['@TC-141', '@regression']},
      async ({createPage}) => {
        const userAPageManagerInstance = await PageManager.from(
          createPage(withLogin(userA), withConnectionRequest(userB)),
        );
        const userAPageManager = userAPageManagerInstance.webapp;
        const userAPages = userAPageManager.pages;

        const conversationName = 'GroupConversation';

        // Preconditions: User B accepts the connection request
        const userBPages = (await PageManager.from(createPage(withLogin(userB)))).webapp.pages;
        await userBPages.connectRequest().clickConnectButton();
        await createGroup(userAPages, conversationName, [userB]);

        await test.step('Step 1: User B sends message to group chat with User A', async () => {
          await userBPages.conversationList().openConversation(conversationName);
          await userBPages.conversation().sendMessage('message before block');
        });

        await test.step('Step 2: User A blocks User B from group conversation', async () => {
          // Ensures User A is in the group before blocking
          await userAPages.conversationList().openConversation(conversationName);
          await blockUserFromOpenGroupProfileView(userAPageManagerInstance, userB);
        });

        await test.step('Step 3: User B writes second message to the group chat after being blocked by User A', async () => {
          await userBPages.conversationList().openConversation(conversationName);
          await userBPages.conversation().sendMessage('message after block');
        });

        await test.step('Step 4: User A receives message from User B in Group Chat even though User B is blocked', async () => {
          await userAPages.conversationList().openConversation(conversationName);
          await expect(userAPages.conversation().messages).toHaveCount(2);
        });
      },
    );

    test(
      'Verify you can unblock user from 1:1 conversation details',
      {tag: ['@TC-142', '@regression']},

      async ({createPage}) => {
        const userAPageManagerInstance = await PageManager.from(
          createPage(withLogin(userA), withConnectionRequest(userB)),
        );
        const userAPageManager = userAPageManagerInstance.webapp;
        const {pages: userAPages, modals: userAModals} = userAPageManager;

        // Preconditions: User B accepts the connection request
        const userBPages = (await PageManager.from(createPage(withLogin(userB)))).webapp.pages;
        await userBPages.connectRequest().clickConnectButton();

        // Step 1: User A and B have a 1:1 conversation
        await userAPages.conversationList().openConversation(userB.fullName);
        // Step 2: User A blocks User B
        await blockUserFromProfileView(userAPageManagerInstance, userB);
        await expect(userAPages.conversation().messageInput).toBeHidden();
        // Step 3: User A unblocks User B from Conversation Details Options
        await userAPages.conversationList().clickConversationOptions(userB.fullName);
        await userAPages.conversationList().clickUnblockConversation();
        await userAModals.confirm().clickAction();
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
        const message = userAPages.conversation().getMessage({sender: userB});
        await expect(message).toContainText('Message after being unblocked');
      },
    );

    test(
      'Verify you cannot add a person who blocked you to a group chat',
      {tag: ['@TC-143', '@regression']},
      async ({createPage}) => {
        const userAPageManagerInstance = await PageManager.from(
          createPage(withLogin(userA), withConnectedUser(userC), withConnectionRequest(userB)),
        );
        const userAPageManager = userAPageManagerInstance.webapp;
        const {pages: userAPages, modals: userAModals} = userAPageManager;

        const conversationName = 'Group Conversation';

        // Preconditions: User B accepts the connection request
        const userBPageManagerInstance = await PageManager.from(createPage(withLogin(userB)));
        const userBPages = userBPageManagerInstance.webapp.pages;
        await userBPages.connectRequest().clickConnectButton();

        // Step 1: User B blocks User A
        await test.step('User B blocks User A', async () => {
          // Open the conversation with User C to prevent the "Wire cannot open this conversation" modal
          await userAPages.conversationList().openConversation(userC.fullName);
          await blockUserFromConversationList(userBPageManagerInstance, userA);
        });

        // Step 2: User A wants to add B to a group chat after being blocked by User B
        await test.step('Users A tries to add B to a group', async () => {
          await userAPages.conversationList().clickCreateGroup();
          await userAPages.groupCreation().setGroupName(conversationName);
          await userAPages.startUI().selectUsers([userB.username]);
          await userAPages.groupCreation().clickCreateGroupButton();

          // Modal 'modalConversationNotConnectedMessageOne' is visible
          // to ensure User A cannot add B to group conversation
          await expect(userAModals.acknowledge().modal).toBeVisible();
        });
      },
    );

    // TODO: blocked due to Bug-Report [WPB-22119]
    // User B still sees pending connection request even though User A blocked him
    test.skip(
      'Verify you can block a user you sent a connection request from conversation list',
      {tag: ['@TC-144', '@regression']},
      async ({createPage}) => {
        const userAPageManagerInstance = await PageManager.from(
          createPage(withLogin(userA), withConnectionRequest(userB)),
        );

        // Preconditions: User B sees connection request but does not accept it
        await blockUserFromConversationList(userAPageManagerInstance, userB);
        const userBPages = (await PageManager.from(createPage(withLogin(userB)))).webapp.pages;

        // Step 2: User A blocks User B from conversation list
        await blockUserFromConversationList(userAPageManagerInstance, userB);
        // Step 3: User B does not see Connection Request from User A
        await expect(userBPages.conversationList().pendingConnectionRequest).not.toBeVisible();
      },
    );

    test(
      'Verify you can unblock someone from conversation list options',
      {tag: ['@TC-148', '@regression']},
      async ({createPage}) => {
        const userAPageManagerInstance = await PageManager.from(
          createPage(withLogin(userA), withConnectedUser(userC), withConnectionRequest(userB)),
        );
        const userAPageManager = userAPageManagerInstance.webapp;
        const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager;

        // Preconditions: User B accepts the connection request
        const userBPages = (await PageManager.from(createPage(withLogin(userB)))).webapp.pages;
        await userBPages.connectRequest().clickConnectButton();

        await test.step('User A blocks User B', async () => {
          await userAPages.conversationList().openConversation(userC.fullName);
          await blockUserFromConversationList(userAPageManagerInstance, userB);
        });

        await test.step('User A unblocks User B from Search List', async () => {
          await userAComponents.conversationSidebar().clickConnectButton();
          await userAPages.startUI().searchInput.fill(userB.username);
          await userAPages.startUI().selectUser(userB.username);
          await userAModals.userProfile().unblockButton.click();
          await userAModals.confirm().clickAction();
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
    let userA: User;
    let userB: User;

    test.beforeEach(async ({createTeam}) => {
      const team = await createTeam('Test Team', {withMembers: 1});
      userA = team.owner;
      userB = team.members[0];
    });

    test('Verify you can not block a user from your team', {tag: ['@TC-8778', '@regression']}, async ({createPage}) => {
      const userAPageManagerInstance = await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB)));
      const userAPageManager = userAPageManagerInstance.webapp;
      const userAPages = userAPageManager.pages;

      // Step 1: User A opens conversation with User B
      await userAPages.conversationList().openConversation(userB.fullName);

      // Step 2: User A opens the options menu for user B
      await userAPages.conversationList().clickConversationOptions(userB.fullName);

      await expect(userAPages.conversationList().blockConversationMenuButton).not.toBeAttached();
    });
  });
});
