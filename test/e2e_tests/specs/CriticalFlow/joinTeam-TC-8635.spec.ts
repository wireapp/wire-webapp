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

import {getUser} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pages/pageManager';
import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDownUtil';
import {loginUser, sendTextMessageToUser} from 'test/e2e_tests/utils/userActions';

import {test, expect} from '../../test.fixtures';

// Generating test data
const owner = getUser();
const member1 = getUser();
const memberA = getUser();
const teamName = 'Critical';
const conversationName = 'Crits';
const textFromAToOwner = 'Hello Team Owner!';
const textFromOwnerToA = 'Keep up the good work!';
let adminPages: PageManager;

test(
  'New person joins team and setups up device',
  {tag: ['@TC-8635', '@crit-flow-web']},
  async ({pages, api, browser}) => {
    test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

    await test.step('Preconditions: Creating preconditions for the test via API', async () => {
      // Precondition: Team owner exists in a team with 1 team member
      await api.createTeamOwner(owner, teamName);
      owner.teamId = await api.team.getTeamIdForUser(owner);
      addCreatedTeam(owner, owner.teamId);
      const invitationIdForMember1 = await api.team.inviteUserToTeam(member1.email, owner);
      const invitationCodeForMember1 = await api.brig.getTeamInvitationCodeForEmail(
        owner.teamId,
        invitationIdForMember1,
      );
      await api.createPersonalUser(member1, invitationCodeForMember1);

      // Precondition: Team has a group chat with existing team members
      if (!owner.token) {
        throw new Error(`Owner ${owner.username} has no token and can't be used for team creation`);
      }
      if (!(owner.qualifiedId?.id.length && member1.qualifiedId?.id.length)) {
        throw new Error(
          `Owner or member1 qualifiedId is not set. Ensure users are created before creating the conversation. Owner ID: ${
            owner.qualifiedId
          }, Member1 ID: ${member1.qualifiedId}`,
        );
      }
      await api.conversation.createGroupConversation(owner.token, {
        name: conversationName,
        protocol: 'proteus',
        qualifiedUsers: [member1.qualifiedId],
        team: {
          teamid: owner.teamId,
        },
      });

      // Precondition: Team owner adds a new team member A
      const invitationIdForMemberA = await api.team.inviteUserToTeam(memberA.email, owner);
      const invitationCodeForMemberA = await api.brig.getTeamInvitationCodeForEmail(
        owner.teamId,
        invitationIdForMemberA,
      );
      await api.createPersonalUser(memberA, invitationCodeForMemberA);

      // Create Admin context for team owner
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      adminPages = new PageManager(adminPage);
    });

    await test.step('A logs in', async () => {
      await pages.openMainPage();
      await loginUser(memberA, pages);
      await pages.dataShareConsentModal.clickDecline();
    });

    await test.step('Owner logs in', async () => {
      await pages.openMainPage();
      await loginUser(owner, adminPages);
      await pages.dataShareConsentModal.clickDecline();
    });

    await test.step('A searches for Team Owner', async () => {
      await pages.conversationSidebar.clickConnectButton();
      await pages.startUIPage.selectUser(owner.username);
      expect(await pages.userProfileModal.isVisible());
      await pages.userProfileModal.clickStartConversation();
    });

    await test.step('A sends text to Team Owner', async () => {
      await sendTextMessageToUser(pages, owner, textFromAToOwner);
    });

    await test.step('Team owner receives text of A and sends a text to A', async () => {
      await expect(pages.conversationPage.page.getByText(textFromAToOwner)).toBeVisible({timeout: 10000});
      await sendTextMessageToUser(adminPages, memberA, textFromOwnerToA);
    });

    await test.step('A receives Text of Team Owner', async () => {
      await expect(pages.conversationPage.page.getByText(textFromOwnerToA)).toBeVisible({timeout: 10000});
    });

    await test.step('Team owner adds A to chat', async () => {
      // Team owner opens the group chat
      await adminPages.conversationListPage.openConversation(conversationName);
      expect(await adminPages.conversationPage.isConversationOpen(conversationName));

      // Team owner opens group information and adds A to the group
      await adminPages.conversationPage.openGroupInformation();
      expect(await adminPages.conversationDetailsPage.isOpen(conversationName)).toBeTruthy();
      await adminPages.conversationDetailsPage.clickAddPeopleButton();
      await adminPages.conversationDetailsPage.addUsersToConversation([memberA.fullName]);

      // Team owner confirms the addition of A to the group
      expect(await adminPages.conversationDetailsPage.isUserPartOfConversationAsMember(memberA.fullName));
      await expect(
        adminPages.conversationPage.page.getByText(`You added ${memberA.fullName} to the conversation`),
      ).toBeVisible({timeout: 10000});
    });

    await test.step('A sees the chat', async () => {
      await pages.conversationListPage.openConversation(conversationName);
      expect(await adminPages.conversationPage.isConversationOpen(conversationName));
    });

    await test.step('Team owner mentions A', async () => {
      await adminPages.conversationPage.sendMention(memberA.qualifiedId!.id);
    });

    await test.step('A sees the mention in the chat', async () => {
      await expect(pages.conversationPage.page.getByText(`@${memberA.fullName}`)).toBeVisible({timeout: 10000});
    });
  },
);

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, owner);
});
