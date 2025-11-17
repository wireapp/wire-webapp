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

import {expect} from 'playwright/test';

import {ApiManagerE2E} from '../backend/apiManager.e2e';
import {User} from '../data/user';
import {PageManager} from '../pageManager';

export const loginUser = async (user: User, pageManager: PageManager) => {
  const {pages} = pageManager.webapp;
  await pages.singleSignOn().isSSOPageVisible();
  await pages.singleSignOn().enterEmailOnSSOPage(user.email);
  await pages.login().inputPassword(user.password);
  await pages.login().clickSignInButton();
};

export const sendTextMessageToUser = async (pageManager: PageManager, recipient: User, text: string) => {
  const {pages} = pageManager.webapp;

  await pages.conversationList().openConversation(recipient.fullName);
  expect(await pages.conversation().isConversationOpen(recipient.fullName));

  await pages.conversation().sendMessage(text);

  // TODO: Bug [WPB-18226] Message is not visible in the conversation after sending it
  await pages.conversation().page.waitForTimeout(3000); // Wait for the message to be sent
  await pageManager.refreshPage({waitUntil: 'domcontentloaded'});
  // End of TODO: Bug [WPB-18226]

  await expect(pages.conversation().page.getByText(text)).toBeVisible();
};

export const inviteMembers = async (members: User[], owner: User, api: ApiManagerE2E) => {
  await Promise.all(
    members.map(async member => {
      const invitationId = await api.team.inviteUserToTeam(member.email, owner);
      const invitationCode = await api.brig.getTeamInvitationCodeForEmail(owner.teamId!, invitationId);
      await api.createPersonalUser(member, invitationCode);
    }),
  );
};

export const logOutUser = async (pageManager: PageManager, shouldDeleteClient = false) => {
  const {pages, components, modals} = pageManager.webapp;
  await components.conversationSidebar().clickPreferencesButton();
  await pages.account().clickLogoutButton();
  expect(modals.confirmLogout().isVisible()).toBeTruthy();
  if (shouldDeleteClient) {
    await modals.confirmLogout().toggleModalCheck();
    expect(modals.confirmLogout().modalCheckbox.isChecked()).toBeTruthy();
  }
  await modals.confirmLogout().clickConfirm();
};

export const sendTextMessageToConversation = async (
  pageManager: PageManager,
  conversation: string,
  message: string,
) => {
  const {pages} = pageManager.webapp;
  await pages.conversationList().openConversation(conversation);
  await pages.conversation().sendMessage(message);
};

type UserPages = PageManager['webapp']['pages'];
export const createGroup = async (pages: UserPages, conversationName: string, user: User[]) => {
  await pages.conversationList().clickCreateGroup();
  await pages.groupCreation().setGroupName(conversationName);
  await pages.startUI().selectUsers(user.map(user => user.username));
  await pages.groupCreation().clickCreateGroupButton();
};

export const createChannel = async (pages: UserPages, conversationName: string, user: User[]) => {
  await pages.conversationList().clickCreateGroup();
  await pages.groupCreation().setGroupName(conversationName);
  await pages.groupCreation().clickNextButton();
  // task: set params for testing
  await pages.startUI().selectUsers(user.flatMap(user => user.username));
  await pages.groupCreation().clickCreateGroupButton();
};

export const handleAppLockState = async (pageManager: PageManager, appLockPassCode: string) => {
  const {modals} = pageManager.webapp;
  const appLockModal = await modals.appLock();
  if (await appLockModal.isVisible()) {
    if (await appLockModal.lockPasscodeInput.isVisible()) {
      await appLockModal.setPasscode(appLockPassCode);
    } else {
      await appLockModal.unlockAppWithPasscode(appLockPassCode);
    }
  }
};

/**
 * Logs in a user and handles initial setup
 */
export async function loginAndSetup(user: User, pageManager: PageManager) {
  const {modals, components} = pageManager.webapp;
  await pageManager.openMainPage();
  await loginUser(user, pageManager); // Verwendet die bestehende loginUser-Funktion
  await modals.dataShareConsent().clickDecline();
  await components.conversationSidebar().isPageLoaded();
}

/**
 * Manually connects User A to user B via the UI
 */
export async function connectUsersManually(
  userA: User,
  userB: User,
  userAPageManager: PageManager,
  userBPageManager: PageManager,
) {
  const {modals: userAModals, components: userAComponents, pages: userAPages} = userAPageManager.webapp;
  const {pages: userBPages} = userBPageManager.webapp;

  await userAComponents.conversationSidebar().clickConnectButton();
  await userAPages.startUI().searchInput.fill(userB.username);
  await userAPages.startUI().selectUser(userB.username);
  await userAModals.userProfile().clickConnectButton();

  expect(await userAPages.conversationList().isConversationItemVisible(userB.fullName)).toBeTruthy();
  await expect(await userBPageManager.getPage()).toHaveTitle('(1) Wire');

  await userBPages.conversationList().openPendingConnectionRequest();
  await userBPages.connectRequest().clickConnectButton();
}

/**
 * Blocks a user from the conversation list
 * @param pageManager PageManager of the blocking user
 * @param userToBlock User object of the user to be blocked
 * @param options Optional parameters, e.g. to handle additional modals
 */
export async function blockUserFromConversationList(
  pageManager: PageManager,
  userToBlock: User,
  options: {handleUnableToOpenModal?: boolean} = {},
) {
  const {pages, modals} = pageManager.webapp;
  const {handleUnableToOpenModal = false} = options;

  await pages.conversationList().openConversation(userToBlock.fullName);
  await pages.conversationList().clickConversationOptions(userToBlock.fullName);
  await pages.conversationList().clickBlockConversation();
  await modals.blockWarning().clickBlock();

  // Optional handling for modals that appear after blocking
  if (handleUnableToOpenModal) {
    if (await modals.unableToOpenConversation().modal.isVisible({timeout: 3000})) {
      await modals.unableToOpenConversation().clickAcknowledge();
    }
  }
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
