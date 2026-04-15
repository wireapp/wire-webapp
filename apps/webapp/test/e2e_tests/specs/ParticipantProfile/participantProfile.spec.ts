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

async function openParticipantDetailsFromGroup(
  pages: PageManager['webapp']['pages'],
  groupName: string,
  participantName: string,
) {
  await pages.conversationList().getConversation(groupName).open();
  await pages.conversation().clickConversationInfoButton();
  await pages.conversationDetails().openParticipantDetails(participantName);
}

async function acceptConnectionRequest(pages: PageManager['webapp']['pages']) {
  await pages.conversationList().openPendingConnectionRequest();
  await pages.connectRequest().clickConnectButton();
}

test.describe('Participant Profile', () => {
  let team: Team;
  let userA: User;
  let userB: User;
  let groupName: string;

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    team = await createTeam('Test Team', {users: [userB]});
    userA = team.owner;
    groupName = 'Test Group';
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

      await acceptConnectionRequest(userCPages);

      await test.step('Go to any 1:1 conversation', async () => {
        await userAPages.conversationList().getConversation(userC.fullName, {protocol: 'mls'}).open();
      });

      await test.step('Open People popover', async () => {
        await userAPages.conversation().clickConversationTitle();

        await expect(userAPages.participantDetails().userName).toBeVisible();
        await expect(userAPages.participantDetails().userName).toContainText(userC.fullName);
        await expect(userAPages.participantDetails().getUserEmailLocator(userC.username)).not.toBeVisible();

        await expect(userAPages.participantDetails().userPicture).toBeVisible();
        await expect(userAPages.participantDetails().createGroup).toBeVisible();
        await expect(userAPages.participantDetails().block).toBeVisible();
      });

      await test.step('Click on the X button to close the popover', async () => {
        await userAPages.participantDetails().closeParticipantDetails();
        await expect(userAPages.participantDetails().userName).not.toBeVisible();
        await expect(userAPages.participantDetails().userPicture).not.toBeVisible();
      });
    },
  );

  test(
    'See participant profile of the user that you requested to connect with in a group conversation',
    {tag: ['@TC-1477', '@regression']},
    async ({createPage, createUser}) => {
      const userC = await createUser();
      const [userAPages, userBPages, userCPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectionRequest(userC))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userC))).then(pm => pm.webapp.pages),
      ]);

      await acceptConnectionRequest(userCPages);

      await test.step('User C is in group with User A and B. User C is not connected to user B', async () => {
        await createGroup(userAPages, groupName, [userB, userC]);
      });

      await test.step('User B asks to connect with user C', async () => {
        await openParticipantDetailsFromGroup(userBPages, groupName, userC.fullName);
        await userBPages.participantDetails().sendConnectRequest();
      });

      await test.step('User B opens individual people profile of user C', async () => {
        await expect(userBPages.participantDetails().userPicture).toBeVisible();
        await expect(userBPages.participantDetails().userPicture).toHaveAttribute('data-uie-status', 'pending');

        await expect(userBPages.participantDetails().userName).toBeVisible();
        await expect(userBPages.participantDetails().userName).toContainText(userC.fullName);

        await expect(userBPages.participantDetails().getUserEmailLocator(userC.email)).not.toBeVisible();
        await expect(userBPages.participantDetails().cancelRequest).toBeVisible();
        await expect(userBPages.participantDetails().block).toBeVisible();
      });

      // Validate email visibility for team member in participant details
      await openParticipantDetailsFromGroup(userAPages, groupName, userB.fullName);
      await expect(userAPages.participantDetails().getUserEmailLocator(userB.email)).toBeVisible();
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
      await acceptConnectionRequest(userCPages);

      await createGroup(pages, groupName, [userB, userC]);

      await test.step('User A blocks User C', async () => {
        await openParticipantDetailsFromGroup(pages, groupName, userC.fullName);
        await pages.participantDetails().blockUser();
        await modals.blockWarning().clickBlock();
      });

      await test.step('User C opens people popover', async () => {
        await pages.conversationList().getConversation(groupName).open();
        await pages.conversation().clickConversationTitle();
      });

      await test.step('User C opens individual people profile of User A', async () => {
        await pages.conversationDetails().openParticipantDetails(userC.fullName);

        await expect(pages.participantDetails().userPicture).toBeVisible();
        await expect(pages.participantDetails().userPicture).toHaveAttribute('data-uie-status', 'blocked');

        await expect(pages.participantDetails().userName).toBeVisible();
        await expect(pages.participantDetails().userName).toContainText(userC.fullName);

        await expect(pages.participantDetails().getUserEmailLocator(userC.email)).not.toBeVisible();
        await expect(pages.participantDetails().unblockButton).toBeVisible();
        await expect(pages.participantDetails().removeFromGroupButton).toBeVisible();
      });
    },
  );

  test(
    'Verify big profile picture and username are shown on participant popover',
    {tag: ['@TC-1480', '@regression']},
    async ({createPage}) => {
      const [adminPage, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await createGroup(adminPage, groupName, [userB]);
      await openParticipantDetailsFromGroup(userBPages, groupName, userA.fullName);

      await expect(userBPages.participantDetails().userPicture).toBeVisible();
      await expect(userBPages.participantDetails().userName).toBeVisible();
      await expect(userBPages.participantDetails().userName).toContainText(userA.fullName);
    },
  );

  test(
    'I want to see the external icon on the profile of an external participant',
    {tag: ['@TC-1484', '@regression']},
    async ({createPage, createUser}) => {
      const externalUser = await createUser();
      await team.addTeamMember(externalUser, {role: 'EXTERNAL'});

      const [adminPage, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(externalUser))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await createGroup(adminPage, groupName, [userB, externalUser]);
      await openParticipantDetailsFromGroup(userBPages, groupName, externalUser.fullName);

      await expect(userBPages.participantDetails().userStatus).toContainText('External');
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

      await createGroup(adminPage, groupName, [userB]);
      await openParticipantDetailsFromGroup(userBPages, groupName, userA.fullName);

      await expect(userBPages.participantDetails().userStatus).toContainText('Group Admin');
    },
  );

  test(
    'I want to see the group admin icon as an admin seeing the group admin profile',
    {tag: ['@TC-1486', '@regression']},
    async ({createPage}) => {
      const adminPage = await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(
        pm => pm.webapp.pages,
      );

      await createGroup(adminPage, groupName, [userB]);

      await adminPage.conversationList().getConversation(groupName).open();
      await adminPage.conversation().clickConversationInfoButton();

      await adminPage.conversation().makeUserAdmin(userB.fullName);
      await expect(adminPage.participantDetails().userStatus).toContainText('Group Admin');
    },
  );

  test(
    'I want to see Remove from group as an admin seeing a participants profile',
    {tag: ['@TC-1487', '@regression']},
    async ({createPage}) => {
      const adminPage = await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(
        pm => pm.webapp.pages,
      );

      await createGroup(adminPage, groupName, [userB]);
      await openParticipantDetailsFromGroup(adminPage, groupName, userB.fullName);

      const removeFromGroup = adminPage.participantDetails().removeFromGroupButton;
      await expect(removeFromGroup).toBeVisible();
      await expect(removeFromGroup).toHaveText('Remove from group…');
    },
  );

  test(
    'I should not to see Remove from group as a member on participants profile',
    {tag: ['@TC-1488', '@regression']},
    async ({createPage, createUser}) => {
      const userC = await createUser();
      await team.addTeamMember(userC);
      const [adminPage, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await createGroup(adminPage, groupName, [userB, userC]);
      await openParticipantDetailsFromGroup(userBPages, groupName, userC.fullName);

      await expect(userBPages.participantDetails().removeFromGroupButton).not.toBeVisible();
    },
  );
});
