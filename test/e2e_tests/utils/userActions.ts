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

export const loginUser = async (user: User, pm: PageManager) => {
  const {pages} = pm.webapp;
  await pages.singleSignOn().isSSOPageVisible();
  await pages.singleSignOn().enterEmailOnSSOPage(user.email);
  await pages.login().inputPassword(user.password);
  await pages.login().clickSignInButton();
};

export const sendTextMessageToUser = async (pm: PageManager, recipient: User, text: string) => {
  const {pages} = pm.webapp;

  await pages.conversationList().openConversation(recipient.fullName);
  expect(await pages.conversation().isConversationOpen(recipient.fullName));

  await pages.conversation().sendMessage(text);

  // TODO: Bug [WPB-18226] Message is not visible in the conversation after sending it
  await pages.conversation().page.waitForTimeout(3000); // Wait for the message to be sent
  await pm.refreshPage({waitUntil: 'domcontentloaded'});
  // End of TODO: Bug [WPB-18226]

  await expect(pages.conversation().page.getByText(text)).toBeVisible({timeout: 10000});
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

export const logOutUser = async (pm: PageManager, shouldDeleteClient = false) => {
  const {pages, components, modals} = pm.webapp;
  await components.conversationSidebar().clickPreferencesButton();
  await pages.account().clickLogoutButton();
  expect(modals.confirmLogout().isVisible()).toBeTruthy();
  if (shouldDeleteClient) {
    await modals.confirmLogout().toggleModalCheck();
    expect(modals.confirmLogout().modalCheckbox.isChecked()).toBeTruthy();
  }
  await modals.confirmLogout().clickConfirm();
};

export const sendTextMessageToConversation = async (pm: PageManager, conversation: string, message: string) => {
  const {pages} = pm.webapp;
  await pages.conversationList().openConversation(conversation);
  await pages.conversation().sendMessage(message);
  expect(await pages.conversation().isMessageVisible(message)).toBeTruthy();
};
