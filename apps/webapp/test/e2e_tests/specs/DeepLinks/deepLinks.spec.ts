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
import {expect, test, Team, withConnectedUser, withLogin} from 'test/e2e_tests/test.fixtures';
import {createGroup, sendConnectionRequest} from '../../utils/userActions';
import {UserProfileModal} from '../../pageManager/webapp/modals/userProfile.modal';

type ProfileModalOptions = {
  showGuestChip?: boolean;
  showEmail?: boolean;
  showConnectWarning?: boolean;
  showOpenConversationButton?: boolean;
  showConnectButton?: boolean;
  showBlockButton?: boolean;
  showCancelButton?: boolean;
  showOpenProfileButton?: boolean;
};

async function verifyUserProfileModal(profileModal: UserProfileModal, user: User, options: ProfileModalOptions) {
  await test.step(`Verify user profile modal for ${user.fullName}`, async () => {
    await expect(profileModal.modal).toBeVisible();
    await expect(profileModal.participantFullname).toContainText(user.fullName);
    await expect(profileModal.participantUsername).toContainText(user.username);
    await expect(profileModal.domainLabel).toBeVisible();

    if (options.showEmail) {
      await expect(profileModal.userEmailLabel).toBeVisible();
    }

    if (options.showGuestChip) {
      await expect(profileModal.guestChip).toBeVisible();
    }

    if (options.showConnectWarning) {
      await expect(profileModal.connectWarning).toBeVisible();
    }

    if (options.showOpenConversationButton) {
      await expect(profileModal.openConversationButton).toBeVisible();
    }

    if (options.showConnectButton) {
      await expect(profileModal.connectButton).toBeVisible();
    }

    if (options.showBlockButton) {
      await expect(profileModal.blockButton).toBeVisible();
    }

    if (options.showCancelButton) {
      await expect(profileModal.cancelButton).toBeVisible();
    }

    if (options.showOpenProfileButton) {
      await expect(profileModal.openProfileButton).toBeVisible();
    }
  });
}

test.describe('Deep Links', () => {
  let team: Team;
  let userA: User;
  let userB: User;
  let userC: User;
  let userD: User;

  const groupName = 'DeepLinksGroup';

  test.beforeEach(async ({createUser}) => {
    userC = await createUser();
    userD = await createUser();
  });

  const testCases = [
    {
      title: 'Opening profile deep links as a team member',
      tag: ['@TC-590', '@regression'],
      isTeamMemberScenario: true,
    },
    {
      title: 'Opening profile deep links as a personal account',
      tag: ['@TC-591', '@regression'],
      isTeamMemberScenario: false,
    },
  ];

  for (const testCase of testCases) {
    test(testCase.title, {tag: testCase.tag}, async ({createTeam, createUser, createPage}) => {
      if (testCase.isTeamMemberScenario) {
        // Logic for TC-590
        userB = await createUser();
        team = await createTeam('Test Team', {users: [userB]});
        userA = team.owner;
      } else {
        // Logic for TC-591
        userA = await createUser();
        team = await createTeam('Test Team', {users: [userA]});
        userB = team.owner;
      }

      const [userAPage, userBPage, userCPage, userDPage] = await Promise.all([
        createPage(withLogin(userA)),
        createPage(withLogin(userB), withConnectedUser(userA)),
        createPage(withLogin(userC)),
        createPage(withLogin(userD)),
      ]);
      await sendConnectionRequest(userAPage, userC);
      await sendConnectionRequest(userBPage, userD);

      const userAPageManager = PageManager.from(userAPage);
      const userBPageManager = PageManager.from(userBPage);
      const userCPageManager = PageManager.from(userCPage);
      const userDPageManager = PageManager.from(userDPage);

      const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;
      const {pages: userCPages} = userCPageManager.webapp;
      const {pages: userDPages} = userDPageManager.webapp;

      await userCPages.conversationList().openPendingConnectionRequest();
      await userCPages.connectRequest().connectButton.click();
      await userDPages.conversationList().openPendingConnectionRequest();
      await userDPages.connectRequest().connectButton.click();

      const profileLinks = await Promise.all(
        [userAPage, userBPage, userCPage, userDPage].map(async page => {
          const {pages, components} = PageManager.from(page).webapp;

          await components.conversationSidebar().clickPreferencesButton();
          const profileLink = await pages.settings().profileLink.textContent();
          await components.conversationSidebar().clickAllConversationsButton();

          return profileLink;
        }),
      );

      await test.step('User B sends all profile links to User A', async () => {
        await userBPages.conversationList().getConversationLocator(userA.fullName).open();

        const userLabels = ['A', 'B', 'C', 'D'];

        for (const [index, label] of userLabels.entries()) {
          await userBPages.conversation().sendMessage(`User ${label}: ${profileLinks[index]}`);
        }
      });

      await test.step('User B creates group and sends conversation join link to User A', async () => {
        await createGroup(userBPages, groupName, []);
        await userBPages.conversationList().getConversationLocator(groupName).open();
        await userBPages.conversation().toggleGroupInformation();
        await userBPages.conversationDetails().openGuestOptions();

        const conversationJoinLink = await userBPages.guestOptions().createLink();
        await userBPages.conversationList().getConversationLocator(userA.fullName, {protocol: 'mls'}).open();
        await userBPages.conversation().sendMessage(`Group conversation: ${conversationJoinLink}`);
      });

      await test.step('User A verifies information for every user profile modal', async () => {
        await userAPages.conversationList().getConversationLocator(userB.fullName, {protocol: 'mls'}).open();

        // Verify information for User A
        await userAPages.conversation().getMessage({content: 'User A:'}).getByRole('link').click();
        await verifyUserProfileModal(userAModals.userProfile(), userA, {
          showEmail: true,
          showCancelButton: true,
          showOpenProfileButton: true,
        });
        await userAModals.userProfile().cancelButton.click();

        // Verify information for User B
        await userAPages.conversation().getMessage({content: 'User B:'}).getByRole('link').click();
        await verifyUserProfileModal(userAModals.userProfile(), userB, {
          showEmail: true,
          showOpenConversationButton: true,
          showCancelButton: true,
        });
        await userAModals.userProfile().cancelButton.click();

        // Verify information for User C
        await userAPages.conversation().getMessage({content: 'User C:'}).getByRole('link').click();
        await verifyUserProfileModal(userAModals.userProfile(), userC, {
          showGuestChip: true,
          showConnectWarning: true,
          showOpenConversationButton: true,
          showBlockButton: true,
        });
        await userAModals.userProfile().modalCloseButton.click();

        // Verify information for User D
        await userAPages.conversation().getMessage({content: 'User D:'}).getByRole('link').click();
        await verifyUserProfileModal(userAModals.userProfile(), userD, {
          showGuestChip: true,
          showConnectWarning: true,
          showConnectButton: true,
          showCancelButton: true,
        });
        await userAModals.userProfile().cancelButton.click();

        // User A joins conversation via conversation join link
        await userAPages.conversation().getMessage({content: 'Group conversation:'}).getByRole('link').click();
        await expect(userAModals.confirm().modal).toBeVisible();
        await expect(userAModals.confirm().actionButton).toContainText('Join Conversation');
        await userAModals.confirm().actionButton.click();
        await expect(userAPages.conversationList().getConversationLocator(groupName)).toBeVisible();
      });
    });
  }
});
