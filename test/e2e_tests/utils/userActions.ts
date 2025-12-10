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
  await pages.login().passwordInput.fill(user.password);
  await pages.login().signInButton.click();
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
 * Opens the connections tab, searches for the given user and starts a conversation with him
 * Note: This util only works if both users are part of the same team.
 */
export async function connectWithUser(senderPageManager: PageManager, receiver: Pick<User, 'username'>) {
  const {pages, modals, components} = senderPageManager.webapp;
  await components.conversationSidebar().clickConnectButton();
  await pages.startUI().searchInput.fill(receiver.username);
  await pages.startUI().selectUser(receiver.username);
  await modals.userProfile().clickStartConversation();
}

/**
 * Opens the connections tab, searches for the given user and sends a connection request
 * Note: This util only works if both users are NOT in the same team
 */
export async function sendConnectionRequest(senderPageManager: PageManager, receiver: User) {
  const {pages, modals, components} = senderPageManager.webapp;
  await components.conversationSidebar().clickConnectButton();
  await pages.startUI().searchInput.fill(receiver.username);
  await pages.startUI().selectUser(receiver.username);
  await modals.userProfile().clickConnectButton();
}
