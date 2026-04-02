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
import {test, expect, withConnectedUser, withLogin, Team, withConnectionRequest} from 'test/e2e_tests/test.fixtures';
import {interceptNotifications} from 'test/e2e_tests/utils/mockNotifications.util';
import {connectWithUser, createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Conversations', () => {
  let team: Team;
  let userA: User;
  let userB: User;
  let userC: User;
  const groupName = 'Test Group';

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    userC = await createUser();
    team = await createTeam('Test Team', {users: [userB, userC]});
    userA = team.owner;
  });

  test(
    'I want to see a system message with all group members mentioned on creating a group',
    {tag: ['@TC-2965', '@regression']},
    async ({createPage}) => {
      const userAPages = await PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages);

      await createGroup(userAPages, groupName, [userB, userC]);
      await userAPages.conversationList().openConversation(groupName);

      const firstMessage = userAPages.conversation().systemMessages.first();
      await expect(firstMessage).toContainText(new RegExp(`You started the conversation\\s*${groupName}\\s*with`, 'i'));
      await expect(firstMessage).toContainText(userB.fullName);
      await expect(firstMessage).toContainText(userC.fullName);
    },
  );

  test(
    'I want to see a system message with all group members mentioned when someone else created a group',
    {tag: ['@TC-2966', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await createGroup(userAPages, groupName, [userB, userC]);
      userBPages.conversationList().openConversation(groupName);

      const pattern = new RegExp(
        `${userA.fullName} started the conversation\\s*${groupName}\\s*with\\s*${userC.fullName}\\s*and\\s*you`,
        'i',
      );
      await expect(userBPages.conversation().systemMessages.first()).toContainText(pattern);
    },
  );

  test(
    'I want to see "No matching results. Try entering a different name." when I search for non existent users',
    {tag: ['@TC-2987', '@regression']},
    async ({createPage}) => {
      const userAPages = await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(
        pm => pm.webapp.pages,
      );

      const noResultsMessage = 'No matching results. Try entering a different name.';

      // User A tries to create a group with non-existent users
      await userAPages.conversationList().clickCreateGroup();
      await userAPages.groupCreation().setGroupName(groupName);
      await userAPages.groupCreation().searchPeopleInput.fill('non_existent_user');

      await expect(userAPages.groupCreation().searchPeopleList).toContainText(noResultsMessage);

      // User A creates a group with existing user
      await userAPages.groupCreation().searchPeopleInput.clear();
      await userAPages.groupCreation().selectGroupMembers(userB.username);
      await userAPages.groupCreation().clickCreateGroupButton();

      // User A tries to add non-existent users to the group
      await userAPages.conversation().toggleGroupInformation();
      await userAPages.conversationDetails().clickAddPeopleButton();
      await userAPages.conversationDetails().searchPeopleInput.fill('non_existent_user');
      await expect(userAPages.conversationDetails().searchList).toContainText(noResultsMessage);
    },
  );

  test(
    'Verify the name of the group conversation can be edited',
    {tag: ['@TC-418', '@regression']},
    async ({createPage}) => {
      const userAPages = await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(
        pm => pm.webapp.pages,
      );

      await createGroup(userAPages, groupName, [userB, userC]);

      await userAPages.conversationList().openConversation(groupName);
      await userAPages.conversation().clickConversationInfoButton();
      await userAPages.conversationDetails().changeConversationName('New Group Name');

      await expect(userAPages.conversation().conversationTitle).not.toContainText(groupName);
      await expect(userAPages.conversation().conversationTitle).toContainText('New Group Name');
    },
  );

  test(
    'I want to see Guest icon in participants list',
    {tag: ['@TC-421', '@regression']},
    async ({createPage, createUser}) => {
      const guestUser = await createUser();
      const [adminPage, guestPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectionRequest(guestUser))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(guestUser))).then(pm => pm.webapp.pages),
      ]);

      await guestPages.conversationList().openPendingConnectionRequest();
      await guestPages.connectRequest().clickConnectButton();

      await createGroup(adminPage, groupName, [userB, guestUser]);

      await adminPage.conversationList().openConversation(groupName);
      await adminPage.conversation().clickConversationInfoButton();
      await expect(adminPage.conversationDetails().getUserRoleIcon(guestUser.fullName)).toHaveAttribute(
        'data-uie-name',
        'status-guest',
      );
    },
  );

  test(
    'I want to see usernames for Guest users in participants list',
    {tag: ['@TC-423', '@regression']},
    async ({createPage, createUser}) => {
      const guestUser = await createUser();

      const [adminPage, guestPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectionRequest(guestUser))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(guestUser))).then(pm => pm.webapp.pages),
      ]);

      await guestPages.conversationList().openPendingConnectionRequest();
      await guestPages.connectRequest().clickConnectButton();

      await createGroup(adminPage, groupName, [userB, guestUser]);

      await adminPage.conversationList().openConversation(groupName);
      await adminPage.conversation().clickConversationInfoButton();

      await expect(adminPage.conversation().membersList.filter({hasText: guestUser.fullName})).toBeVisible();
    },
  );

  test(
    'I want to see the empty admins section when there are no Admins',
    {tag: ['@TC-431', '@regression']},
    async ({createPage}) => {
      const [adminPagesManager, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      const {pages: adminPages, modals} = adminPagesManager.webapp;

      await createGroup(adminPages, groupName, [userB, userC]);

      // Confirm that the userA is an admin in the group
      await userBPages.conversationList().openConversation(groupName);
      await userBPages.conversation().clickConversationInfoButton();
      expect(userBPages.conversation().adminsList).toBeVisible();
      expect(userBPages.conversation().adminsList.getByRole('listitem')).toHaveCount(1);

      // User A leaves the group
      await adminPages.conversationList().openConversation(groupName);
      await adminPages.conversation().clickConversationInfoButton();
      await adminPages.conversation().leaveConversation();
      await modals.leaveConversation().clickConfirm();
      await expect(adminPages.conversation().systemMessages.filter({hasText: 'You left'})).toBeVisible();

      // User B sees the empty admins section
      await userBPages.conversationList().openConversation(groupName);
      await userBPages.conversation().clickConversationInfoButton();
      expect(adminPages.conversation().adminsList).not.toBeVisible();
    },
  );

  test(
    'I should not see Members section when there are only admins',
    {tag: ['@TC-432', '@regression']},
    async ({createPage}) => {
      const [adminPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await createGroup(adminPages, groupName, [userB]);

      // User B can see members section
      await adminPages.conversationList().openConversation(groupName);
      await adminPages.conversation().clickConversationInfoButton();
      expect(adminPages.conversation().membersList).toBeVisible();
      expect(adminPages.conversation().membersList.getByRole('listitem')).toHaveCount(1);

      // User A makes userB an admin
      await adminPages.conversation().makeUserAdmin(userB.fullName);

      // User A and B cannot see members section
      await userBPages.conversationList().openConversation(groupName);

      for (const userPages of [adminPages, userBPages]) {
        await userPages.conversation().clickConversationInfoButton();
        await expect(userPages.conversation().adminsList.getByRole('listitem')).toHaveCount(2);
        expect(userPages.conversation().membersList).not.toBeVisible();
      }
    },
  );

  test(
    'I want to see my own profile in the Admin section when I create a conversation',
    {tag: ['@TC-434', '@regression']},
    async ({createPage}) => {
      const adminPages = await PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages);
      await createGroup(adminPages, groupName, [userB]);

      await adminPages.conversationList().openConversation(groupName);
      await adminPages.conversation().clickConversationInfoButton();

      await expect(adminPages.conversation().adminsList.getByRole('listitem')).toHaveCount(1);
      expect(adminPages.conversation().adminsList.getByRole('listitem')).toContainText(userA.fullName);
    },
  );

  test(
    'I want to see External icon for External member in Members list',
    {tag: ['@TC-435', '@regression']},
    async ({createPage, createUser}) => {
      const externalUser = await createUser();
      await team.addTeamMember(externalUser, {role: 'EXTERNAL'});

      const adminPage = await PageManager.from(createPage(withLogin(userA), withConnectedUser(externalUser))).then(
        pm => pm.webapp.pages,
      );

      await createGroup(adminPage, groupName, [userB, externalUser]);

      await adminPage.conversationList().openConversation(groupName);
      await adminPage.conversation().clickConversationInfoButton();
      await expect(adminPage.conversation().membersList).toBeVisible();
      await expect(adminPage.conversationDetails().getUserRoleIcon(externalUser.fullName)).toHaveAttribute(
        'data-uie-name',
        'status-external',
      );
    },
  );

  test(
    'I want to see delete group button and options when I am conversation admin but not creator',
    {tag: ['@TC-436', '@regression']},
    async ({createPage}) => {
      const [adminPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);
      await createGroup(adminPages, groupName, [userB, userC]);

      // User A makes userB an admin
      await adminPages.conversationList().openConversation(groupName);
      await adminPages.conversation().clickConversationInfoButton();
      await adminPages.conversation().makeUserAdmin(userB.fullName);

      // User B can see delete group and options in conversation details
      await userBPages.conversationList().openConversation(groupName);
      await userBPages.conversation().clickConversationInfoButton();
      await expect(userBPages.conversationDetails().deleteGroupButton).toBeVisible();
      await expect(userBPages.conversationDetails().guestOptionsButton).toBeVisible();
      await expect(userBPages.conversationDetails().selfDeletingMessageButton).toBeVisible();
    },
  );

  test(
    'Verify conversation scrolls to first unread message when opening',
    {tag: ['@TC-487', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA), withConnectedUser(userC))),
      ]);

      const {pages, components} = userBPageManager.webapp;
      const totalMessages = 20;

      await test.step('User B opens conversation with User A to mark previous history as read', async () => {
        await pages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

        // User A sends "Read" messages while User B is looking at the chat
        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        for (let i = 1; i <= totalMessages; i++) {
          await userAPages.conversation().sendMessage(`READ message: ${i}`);
        }

        // User B can see the last conversation message in viewport (confirm scroll behavior in opened conversation)
        const lastReadMessage = pages
          .conversation()
          .getMessage({sender: userA})
          .filter({hasText: `READ message: ${totalMessages}`});
        await expect(lastReadMessage).toBeInViewport();
      });

      await test.step('User B switches context to another conversation', async () => {
        await pages.conversationList().openConversation(userC.fullName);
      });

      await test.step('User A sends new unread messages to User B', async () => {
        for (let i = 1; i <= totalMessages; i++) {
          await userAPages.conversation().sendMessage(`UNREAD message: ${i}`);
        }

        const conversationWithUserA = pages
          .conversationList()
          .getConversationLocator(userA.fullName, {protocol: 'mls'});
        await expect(conversationWithUserA.getByTestId('status-unread')).toContainText(`${totalMessages}`);
      });

      await test.step('User B opens the conversation and verifies scroll position', async () => {
        await components.conversationSidebar().clickAllConversationsButton();
        await pages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

        // 1. Verify conversation scroll is NOT at the very bottom (last unread shouldn't be visible yet)
        const lastUnreadMessage = pages
          .conversation()
          .getMessage({content: new RegExp(`UNREAD message: ${totalMessages}$`)});
        await expect(lastUnreadMessage).not.toBeInViewport();

        // 2. Verify conversation scroll is NOT at the old read messages
        const firstReadMessage = pages.conversation().getMessage({content: /^READ message: 1$/});
        await expect(firstReadMessage).not.toBeInViewport();

        // 3. Verify conversation scroll is at the first unread message
        const firstUnreadMessage = pages.conversation().getMessage({content: /UNREAD message: 1$/});
        await expect(firstUnreadMessage).toBeInViewport();
      });

      await test.step('User B scrolls to bottom and verifies unread status is cleared', async () => {
        const lastMessage = pages.conversation().getMessage({sender: userA}).last();
        await lastMessage.scrollIntoViewIfNeeded();

        const conversationWithUserA = pages
          .conversationList()
          .getConversationLocator(userA.fullName, {protocol: 'mls'});
        await expect(conversationWithUserA.getByTestId('status-unread')).not.toBeVisible();
      });
    },
  );

  test(
    'Verify after user was removed from group they cannot do some actions',
    {tag: ['@TC-492', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await test.step('Setup: Create group and exchange initial messages', async () => {
        await createGroup(userBPages, groupName, [userA, userC]);

        // User A and B both send messages to start conversation
        await userAPages.conversationList().openConversation(groupName);
        await userAPages.conversation().sendMessage('Message 1');

        await userBPages.conversationList().openConversation(groupName);
        await userBPages.conversation().sendMessage('Message 2');

        // User A reacts to Message 2 while still a member
        const message2 = userAPages.conversation().getMessage({sender: userB});
        await userAPages.conversation().reactOnMessage(message2, 'plus-one');
        await expect(userAPages.conversation().getReactionOnMessage(message2, 'plus-one')).toBeVisible();
      });

      await test.step('User B removes User A from the group', async () => {
        await userBPages.conversation().toggleGroupInformation();
        await userBPages.conversation().removeMemberFromGroup(userA.fullName);

        const removedSystemMessage = userAPages.conversation().systemMessages.filter({
          hasText: `${userB.fullName} removed you`,
        });
        await expect(removedSystemMessage).toBeVisible();
      });

      await test.step('Verify User A restricted message interactions', async () => {
        const message1 = userAPages.conversation().getMessage({content: 'Message 1'});
        const message2 = userAPages.conversation().getMessage({sender: userB});
        const messageActions = message1.getByRole('group', {name: 'Message actions'}).getByRole('button');

        // 1. Cannot like messages (Hover should not reveal full action set)
        await message1.hover();
        await expect(messageActions).toHaveCount(1);

        // 2. Cannot remove existing reaction
        const reactionPill = userAPages.conversation().getReactionOnMessage(message2, 'plus-one');
        await reactionPill.click();
        await expect(reactionPill).toBeVisible();

        // 3. Cannot see message input area
        await expect(userAPages.conversation().messageInput).not.toBeVisible();
      });

      await test.step('Verify User A restricted group management', async () => {
        await userAPages.conversation().toggleGroupInformation();

        // 1. Cannot add new members
        await expect(userAPages.conversation().addMemberButton).not.toBeVisible();

        // 2. Cannot edit group name
        await expect(userAPages.conversationDetails().editConversationNameButton).not.toBeVisible();

        await userAPages.conversation().toggleGroupInformation();
      });

      await test.step('Verify User A restricted message editing and deletion', async () => {
        const message1 = userAPages.conversation().getMessage({content: 'Message 1'});
        const messageOptions = await userAPages.conversation().openMessageOptions(message1);

        // 1. Cannot Delete for everyone
        await expect(messageOptions).not.toContainText('Delete for everyone');

        // 2. Cannot Edit message
        await expect(messageOptions).not.toContainText('Edit');
      });
    },
  );

  test('Verify emoji autocomplete', {tag: ['@TC-495', '@regression']}, async ({createPage}) => {
    const userAPages = await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(
      pm => pm.webapp.pages,
    );

    await userAPages.conversationList().openConversation(userB.fullName);

    await userAPages.conversation().messageInput.pressSequentially(':) ', {delay: 100});
    expect(userAPages.conversation().messageInput).toContainText('🙂');

    await userAPages.conversation().sendMessageButton.click();
    await expect(userAPages.conversation().getMessage({content: '🙂'})).toBeVisible();
  });

  test(
    'I can see the system message "You renamed the conversation" after renaming conversation',
    {tag: ['@TC-496', '@regression']},
    async ({createPage}) => {
      const adminPages = await PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages);
      await createGroup(adminPages, groupName, [userB, userC]);

      // User A renames the conversation
      await adminPages.conversationList().openConversation(groupName);
      await adminPages.conversation().clickConversationInfoButton();
      await adminPages.conversationDetails().changeConversationName('New Group Name');

      // Verify that the system message is displayed correctly
      await expect(
        adminPages.conversation().systemMessages.filter({hasText: 'You renamed the conversation'}),
      ).toBeVisible();
    },
  );

  test(
    'I should not see a (push) notification when the role of another person has changed',
    {tag: ['@TC-503', '@regression']},
    async ({createPage}) => {
      const [adminPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);

      const adminPages = PageManager.from(adminPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await createGroup(adminPages, groupName, [userB, userC]);
      await userBPages.conversationList().openConversation(groupName);

      const {getNotifications: getUserBNotifications} = await interceptNotifications(userBPage);
      // User A makes User C an admin
      await adminPages.conversationList().openConversation(groupName);
      await adminPages.conversation().toggleGroupInformation();
      await adminPages.conversation().makeUserAdmin(userC.fullName);

      // Verify User C is admin in the conversation
      await userBPages.conversation().clickConversationInfoButton();
      await expect(userBPages.conversation().adminsList).toContainText(userC.fullName);
      // Verify that User B doesn't receive a push notification
      await expect.poll(() => getUserBNotifications()).toHaveLength(0);
    },
  );

  test(
    'Verify help text is gone when I have at least one conversation after I was offline',
    {tag: ['@TC-778', '@regression']},
    async ({createPage}) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))),
        PageManager.from(createPage(withLogin(userB))),
      ]);

      const {pages, components} = userAPageManager.webapp;

      await expect(pages.conversationList().list).toContainText('Welcome to Wire');
      await expect(pages.conversationList().list.getByRole('listitem')).toHaveCount(0);

      // User A logs out
      await components.conversationSidebar().clickPreferencesButton();
      await pages.settings().accountButton.click();
      await pages.account().clickLogoutButton();

      // User B connects to User A
      await connectWithUser(userBPageManager, userA);

      // User A logs in
      await userAPageManager.openLoginPage();
      await pages.login().login(userA);
      await components.conversationSidebar().clickAllConversationsButton();

      await expect(pages.conversationList().list).not.toContainText('Welcome to Wire');
      await expect(pages.conversationList().list.getByRole('listitem')).toHaveCount(1);
    },
  );

  test(
    'Verify help text is gone when I have at least one conversation while I am online',
    {tag: ['@TC-780', '@regression']},
    async ({createPage}) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))),
        PageManager.from(createPage(withLogin(userB))),
      ]);

      const pages = userAPageManager.webapp.pages;
      // User A can see help text
      await expect(pages.conversationList().list).toContainText('Welcome to Wire');
      await expect(pages.conversationList().list.getByRole('listitem')).toHaveCount(0);

      await connectWithUser(userBPageManager, userA);

      // User A sees conversation with userD instead of help text
      await expect(pages.conversationList().list).not.toContainText('Welcome to Wire');
      await expect(pages.conversationList().list.getByRole('listitem').first()).toContainText(userB.fullName);
      await expect(pages.conversationList().list.getByRole('listitem')).toHaveCount(1);
    },
  );
});
