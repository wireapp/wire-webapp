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
import {expect, test, withConnectedUser, withConnectionRequest, withLogin} from 'test/e2e_tests/test.fixtures';
import {Page} from '@playwright/test';
import {createGroup} from '../../utils/userActions';
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

async function copyProfileLink(page: Page): Promise<string> {
  const {pages, components} = PageManager.from(page).webapp;

  await components.conversationSidebar().preferencesButton.click();
  await pages.settings().copyProfileLinkButton.click();
  await components.conversationSidebar().allConverationsButton.click();

  const copiedLink = await page.evaluate(async () => {
    return await navigator.clipboard.readText();
  });

  return copiedLink;
}

test.describe('Deep Links', () => {
  const testCases = [
    {
      title: 'Opening profile deep links as a team member',
      tag: ['@TC-590', '@regression'],
      setupUsers: async (createTeam: any, createUser: any, createPage: any) => {
        const userB = await createUser();
        const team = await createTeam('Test Team', {users: [userB]});
        const userA = team.owner;
        const userC = await createUser();
        const userD = await createUser();

        const [userAPage, userBPage, userCPage, userDPage] = await Promise.all([
          createPage(withLogin(userA), withConnectedUser(userB), withConnectionRequest(userC)),
          createPage(withLogin(userB), withConnectionRequest(userD)),
          createPage(withLogin(userC)),
          createPage(withLogin(userD)),
        ]);

        return {userA, userB, userC, userD, userAPage, userBPage, userCPage, userDPage};
      },
    },
    {
      title: 'Opening profile deep links as a personal account',
      tag: ['@TC-591', '@regression'],
      setupUsers: async (createTeam: any, createUser: any, createPage: any) => {
        const userA = await createUser();
        const team = await createTeam('Test Team', {users: [userA]});
        const userB = team.owner;
        const userC = await createUser();
        const userD = await createUser();

        const [userAPage, userBPage, userCPage, userDPage] = await Promise.all([
          createPage(withLogin(userA), withConnectionRequest(userC)),
          createPage(withLogin(userB), withConnectedUser(userA), withConnectionRequest(userD)),
          createPage(withLogin(userC)),
          createPage(withLogin(userD)),
        ]);

        return {userA, userB, userC, userD, userAPage, userBPage, userCPage, userDPage};
      },
    },
  ];

  for (const testCase of testCases) {
    test(testCase.title, {tag: testCase.tag}, async ({createTeam, createUser, createPage}) => {
      const {userA, userB, userC, userD, userAPage, userBPage, userCPage, userDPage} = await testCase.setupUsers(
        createTeam,
        createUser,
        createPage,
      );

      const userAPageManager = PageManager.from(userAPage);
      const userBPageManager = PageManager.from(userBPage);
      const userCPageManager = PageManager.from(userCPage);
      const userDPageManager = PageManager.from(userDPage);

      const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;
      const {pages: userCPages} = userCPageManager.webapp;
      const {pages: userDPages} = userDPageManager.webapp;

      await userCPages.conversationList().pendingConnectionRequest.click();
      await userCPages.connectRequest().connectButton.click();
      await userDPages.conversationList().pendingConnectionRequest.click();
      await userDPages.connectRequest().connectButton.click();

      await test.step('User A copies and sends profile deeplink to User B and User A verifies information', async () => {
        const copiedProfileLinkUserA = await copyProfileLink(userAPage);
        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userAPages.conversation().sendMessage('UserA profile link: ' + copiedProfileLinkUserA);

        await userAPages.conversation().getMessage({sender: userA}).getByRole('link').click();

        await verifyUserProfileModal(userAModals.userProfile(), userA, {
          showEmail: true,
          showCancelButton: true,
          showOpenProfileButton: true,
        });

        await userAModals.userProfile().cancelButton.click();
      });

      await test.step('User B copies and sends profile deeplink to User A and User A verifies information', async () => {
        const copiedProfileLinkUserB = await copyProfileLink(userBPage);
        await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
        await userBPages.conversation().sendMessage('UserB profile link: ' + copiedProfileLinkUserB);

        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userAPages.conversation().getMessage({sender: userB}).getByRole('link').click();

        await verifyUserProfileModal(userAModals.userProfile(), userB, {
          showEmail: true,
          showOpenConversationButton: true,
          showCancelButton: true,
        });

        await userAModals.userProfile().cancelButton.click();
      });

      await test.step('User C copies and sends profile deeplink to User A and User A verifies information', async () => {
        const copiedProfileLinkUserC = await copyProfileLink(userCPage);
        await userCPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
        await userCPages.conversation().sendMessage('UserC profile link: ' + copiedProfileLinkUserC);

        await userAPages.conversationList().openConversation(userC.fullName, {protocol: 'mls'});
        await userAPages.conversation().getMessage({sender: userC}).getByRole('link').click();

        await verifyUserProfileModal(userAModals.userProfile(), userC, {
          showGuestChip: true,
          showConnectWarning: true,
          showOpenConversationButton: true,
          showBlockButton: true,
        });

        await userAModals.userProfile().modalCloseButton.click();
      });

      await test.step('User D copies and sends profile deeplink to User B, who sends this link to User A and User A verifies information', async () => {
        const copiedProfileLinkUserD = await copyProfileLink(userDPage);
        await userDPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userDPages.conversation().sendMessage('UserD profile link: ' + copiedProfileLinkUserD);
        await expect(userDPages.conversation().getMessage({sender: userD})).toBeVisible();

        await userBPages.conversationList().openConversation(userD.fullName, {protocol: 'mls'});
        const profileLinkUserD = userBPages.conversation().getMessage({sender: userD});
        await profileLinkUserD.hover();
        await userBPages.conversation().copyMessage(profileLinkUserD);

        const copiedProfileLinkFromUserD = await userBPage.evaluate(async () => {
          return await navigator.clipboard.readText();
        });

        await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
        await userBPages.conversation().sendMessage(copiedProfileLinkFromUserD);
        await expect(userBPages.conversation().getMessage({sender: userB})).toBeVisible();

        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userAPages.conversation().getMessage({content: 'UserD'}).getByRole('link').click();

        await verifyUserProfileModal(userAModals.userProfile(), userD, {
          showGuestChip: true,
          showConnectWarning: true,
          showConnectButton: true,
          showCancelButton: true,
        });

        await userAModals.userProfile().connectButton.click();
        await expect(userDPages.conversationList().pendingConnectionRequest).toBeVisible();
      });

      await test.step('User B creates group with User D and sends group link to User A, then User A clicks on the link and verifies popup', async () => {
        const groupName = 'DeepLinksGroup';
        await createGroup(userBPages, groupName, [userD]);
        await userBPages.conversationList().openConversation(groupName);
        await userBPages.conversation().toggleGroupInformation();
        await userBPages.conversationDetails().openGuestOptions();

        const conversationJoinLink = await userBPages.guestOptions().createLink();
        await userBPages.conversation().sendMessage(conversationJoinLink);

        await userBPages.conversation().conversationInfoButton.click();
        await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
        await userBPages.conversation().sendMessage(conversationJoinLink);

        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        const messageWithConversationJoinLink = userAPages
          .conversation()
          .getMessage({sender: userB, content: conversationJoinLink});
        await messageWithConversationJoinLink.getByRole('link').click();
        await expect(userAModals.confirm().modal).toBeVisible();
        await expect(userAModals.confirm().actionButton).toContainText('Join Conversation');
        await userAModals.confirm().actionButton.click();
        await expect(userAPages.conversationList().getConversationLocator(groupName)).toBeVisible();
      });
    });
  }
});
