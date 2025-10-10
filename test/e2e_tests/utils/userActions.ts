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

import {ApiManagerE2E} from '../backend/apiManager.e2e';
import {User} from '../data/user';
import {PageManager} from '../pageManager';
import {expect} from '../test.fixtures';

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

  // TODO: Bug [WPB-18226] Message is not visible in the conversation after sending it
  await pages.conversation().page.waitForTimeout(3000); // Wait for the message to be sent
  await pageManager.refreshPage({waitUntil: 'domcontentloaded'});
  // End of TODO: Bug [WPB-18226]

  expect(await pages.conversation().isMessageVisible(message)).toBeTruthy();
};

export const createGroup = async (pageManager: PageManager, conversationName: string, user: User[]) => {
  await pageManager.webapp.pages.conversationList().clickCreateGroup();
  await pageManager.webapp.pages.groupCreation().setGroupName(conversationName);
  await pageManager.webapp.pages.startUI().selectUsers(user.flatMap(user => user.username));
  await pageManager.webapp.pages.groupCreation().clickCreateGroupButton();
};

export const createChannel = async (pageManager: PageManager, conversationName: string, user: User[]) => {
  await pageManager.webapp.pages.conversationList().clickCreateGroup();
  await pageManager.webapp.pages.groupCreation().setGroupName(conversationName);
  await pageManager.webapp.pages.groupCreation().clickNextButton();
  // task: set params for testing
  await pageManager.webapp.pages.startUI().selectUsers(user.flatMap(user => user.username));
  await pageManager.webapp.pages.groupCreation().clickCreateGroupButton();
};
