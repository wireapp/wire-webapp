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
import {createGroup} from 'test/e2e_tests/utils/userActions';

import {test, expect, withConnectedUser, withLogin, withConnectionRequest, Team} from 'test/e2e_tests/test.fixtures';

test.describe('Participant Profile', () => {
  let team: Team;
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam}) => {
    team = await createTeam('Test Team', {withMembers: 1});
    userA = team.owner;
    userB = team.members[0];
  });

  test(
    'Verify you can access profile information for the other participant in a 1to1 conversation',
    {tag: ['@TC-1474', '@regression']},
    async ({createPage, createUser}) => {
      const userC = await createUser();
      const [userAPages, userCPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectionRequest(userC))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userC))).then(pm => pm.webapp.pages),
      ]);

      await userCPages.conversationList().openPendingConnectionRequest();
      await userCPages.connectRequest().clickConnectButton();

      await test.step('Go to any 1:1 conversation', async () => {
        await userAPages.conversationList().openConversation(userC.fullName, {protocol: 'mls'});
      });

      await test.step('Open People popover', async () => {
        await userAPages.conversation().clickConversationTitle();

        await expect(await userAPages.participantDetails().getUserNameLocator(userC.username)).toBeVisible();
        await expect(await userAPages.participantDetails().getUserNameLocator(userC.username)).toContainText(
          userC.username,
        );

        await expect(userAPages.participantDetails().userPicture).toBeVisible();
        await expect(userAPages.participantDetails().createGroup).toBeVisible();
        await expect(userAPages.participantDetails().block).toBeVisible();
      });

      await test.step('Click on the X button to close the popover', async () => {
        await userAPages.participantDetails().closeParticipantDetails();
        await expect(await userAPages.participantDetails().getUserNameLocator(userB.username)).not.toBeVisible();
        await expect(userAPages.participantDetails().userPicture).not.toBeVisible();
      });
    },
  );

  test(
    'See participant profile of the user that you requested to connect with in a group conversation',
    {tag: ['@TC-1477', '@regression']},
    async ({createPage, createUser}) => {
      const userC = await createUser();
      const [userAPage, userBPages, userCPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectionRequest(userC))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userC))).then(pm => pm.webapp.pages),
      ]);

      await userCPages.conversationList().openPendingConnectionRequest();
      await userCPages.connectRequest().clickConnectButton();

      const groupName = 'Test Group';
      await test.step('User C is in group with User A and B. User C is not connected to user B', async () => {
        await createGroup(userAPage, groupName, [userB, userC]);
      });

      await test.step('User B asks to connect with user C', async () => {
        await userBPages.conversationList().openConversation(groupName);
        await userBPages.conversation().clickConversationTitle();

        await userBPages.conversationDetails().openParticipantDetails(userC.fullName);
        await userBPages.participantDetails().sendConnectRequest();
      });

      await test.step('User B opens people popover', async () => {});

      await test.step('User B opens individual people profile of user C', async () => {
        await expect(userBPages.participantDetails().userPicture).toBeVisible();
        await expect(userBPages.participantDetails().userPicture).toHaveAttribute('data-uie-status', 'pending');

        await expect(await userBPages.participantDetails().getUserNameLocator(userC.username)).toBeVisible();
        await expect(await userBPages.participantDetails().getUserNameLocator(userC.username)).toContainText(
          userC.username,
        );

        await expect(await userBPages.participantDetails().getUserEmailLocator(userC.email)).not.toBeVisible();
        await expect(userBPages.participantDetails().cancelRequest).toBeVisible();
        await expect(userBPages.participantDetails().block).toBeVisible();
      });
    },
  );

  test(
    'Verify I can see participant profile of user I blocked in a group conversation',
    {tag: ['@TC-1479', '@regression']},
    async ({createPage, createUser}) => {
      const userC = await createUser();
      const [userAPageManager, userCPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectionRequest(userC))),
        PageManager.from(createPage(withLogin(userC))).then(pm => pm.webapp.pages),
      ]);

      const {pages, modals} = userAPageManager.webapp;
      await userCPages.conversationList().openPendingConnectionRequest();
      await userCPages.connectRequest().clickConnectButton();

      const groupName = 'Test Group';
      await createGroup(pages, groupName, [userB, userC]);

      await test.step('User A blocks User C', async () => {
        await pages.conversationList().openConversation(groupName);
        await pages.conversation().clickConversationTitle();

        await pages.conversationDetails().openParticipantDetails(userC.fullName);
        await pages.participantDetails().blockUser();
        await modals.blockWarning().clickBlock();
      });

      await test.step('User C opens people popover', async () => {
        await pages.conversationList().openConversation(groupName);
        await pages.conversation().clickConversationTitle();
      });

      await test.step('User C opens individual people profile of User A', async () => {
        await pages.conversationDetails().openParticipantDetails(userC.fullName);

        await expect(pages.participantDetails().userPicture).toBeVisible();
        await expect(pages.participantDetails().userPicture).toHaveAttribute('data-uie-status', 'blocked');

        await expect(await pages.participantDetails().getUserNameLocator(userC.username)).toBeVisible();
        await expect(await pages.participantDetails().getUserNameLocator(userC.username)).toContainText(userC.username);

        await expect(await pages.participantDetails().getUserEmailLocator(userC.email)).not.toBeVisible();
        await expect(pages.participantDetails().unblockButton).toBeVisible();
        await expect(pages.participantDetails().removeFromGroup).toBeVisible();
      });
    },
  );

  test(
    'Verify big profile picture ans username are shown on participant popover',
    {tag: ['@TC-1480', '@regression']},
    async ({createPage}) => {
      const [adminPage, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      const groupName = 'Test Group';
      await createGroup(adminPage, groupName, [userB]);

      await userBPages.conversationList().openConversation(groupName);
      await userBPages.conversation().clickConversationInfoButton();
      await userBPages.conversationDetails().openParticipantDetails(userA.fullName);

      await expect(await userBPages.participantDetails().getUserNameLocator(userA.username)).toBeVisible();
      await expect(await userBPages.participantDetails().getUserNameLocator(userA.username)).toContainText(
        userA.username,
      );
      await expect(userBPages.participantDetails().userPicture).toBeVisible;
    },
  );

  test(
    'I want to see the external icon on the profile of an external participant',
    {tag: ['@TC-1484', '@regression']},
    async ({createPage, createUser}) => {
      const externalUser = await createUser();
      const [adminPage, userBPages, userExternalPage] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectionRequest(externalUser))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(externalUser))).then(pm => pm.webapp.pages),
      ]);

      await userExternalPage.conversationList().openPendingConnectionRequest();
      await userExternalPage.connectRequest().clickConnectButton();

      const groupName = 'Test Group';
      await createGroup(adminPage, groupName, [userB, externalUser]);

      await userBPages.conversationList().openConversation(groupName);
      await userBPages.conversation().clickConversationInfoButton();
      await userBPages.conversationDetails().openParticipantDetails(externalUser.fullName);

      await expect(userBPages.participantDetails().guestStatus).toBeVisible();
      await expect(userBPages.participantDetails().guestStatus).toContainText('Guest');
    },
  );

  test(
    'I want to see the group admin icon as a member seeing the group admin profile',
    {tag: ['@TC-1485', '@regression']},
    async ({createPage}) => {
      const [adminPage, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      const groupName = 'Test Group';
      await createGroup(adminPage, groupName, [userB]);

      await userBPages.conversationList().openConversation(groupName);
      await userBPages.conversation().clickConversationInfoButton();
      await userBPages.conversationDetails().openParticipantDetails(userA.fullName);

      await expect(userBPages.participantDetails().adminStatus).toBeVisible();
      await expect(userBPages.participantDetails().adminStatus).toContainText('Group Admin');
    },
  );

  test(
    'I want to see the group admin icon as an admin seeing the group admin profile',
    {tag: ['@TC-1486', '@regression']},
    async ({createPage}) => {
      const adminPage = await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(
        pm => pm.webapp.pages,
      );

      const groupName = 'Test Group';
      await createGroup(adminPage, groupName, [userB]);

      await adminPage.conversationList().openConversation(groupName);
      await adminPage.conversation().clickConversationInfoButton();

      await adminPage.conversation().makeUserAdmin(userB.fullName);

      await expect(adminPage.participantDetails().adminStatus).toBeVisible();
      await expect(adminPage.participantDetails().adminStatus).toContainText('Group Admin');
    },
  );

  test(
    'I want to see Remove from group as an admin seeing a participants profile',
    {tag: ['@TC-1487', '@regression']},
    async ({createPage}) => {
      const adminPage = await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(
        pm => pm.webapp.pages,
      );

      await createGroup(adminPage, 'Test Group', [userB]);
      await adminPage.conversationList().openConversation('Test Group');

      await adminPage.conversation().clickConversationInfoButton();
      await adminPage.conversationDetails().openParticipantDetails(userB.fullName);

      const removeFromGroup = adminPage.conversation().removeUserButton;
      await expect(removeFromGroup).toBeVisible();
      await expect(removeFromGroup).toContainText('Remove from group…');
    },
  );

  test(
    'I should not to see Remove from group as a member on participants profile',
    {tag: ['@TC-1488', '@regression']},
    async ({createPage, createUser}) => {
      const userC = await createUser();
      await team.addMember(userC);
      const [adminPage, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      const groupName = 'Test Group';
      await createGroup(adminPage, groupName, [userB, userC]);

      await userBPages.conversationList().openConversation(groupName);
      await userBPages.conversation().clickConversationInfoButton();
      await userBPages.conversationDetails().openParticipantDetails(userC.fullName);

      const removeFromGroup = userBPages.conversation().removeUserButton;
      await expect(removeFromGroup).not.toBeVisible();
    },
  );
});
