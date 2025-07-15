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
import {PageManager} from '../pages/pageManager';
import {expect} from '../test.fixtures';

export const loginUser = async (user: User, pages: PageManager) => {
  await pages.singleSignOnPage.isSSOPageVisible();
  await pages.singleSignOnPage.enterEmailOnSSOPage(user.email);
  await pages.loginPage.inputPassword(user.password);
  await pages.loginPage.clickSignInButton();
};

export const sendTextMessageToUser = async (pages: PageManager, recipient: User, text: string) => {
  // Team owner opens conversation with A
  await pages.conversationListPage.openConversation(recipient.fullName);
  expect(await pages.conversationPage.isConversationOpen(recipient.fullName));

  // Team owner sends a text to A
  await pages.conversationPage.sendMessage(text);
  await pages.conversationPage.page.waitForTimeout(1000); // Wait for the message to be sent
  // TODO: Bug [WPB-18226] Message is not visible in the conversation after sending it
  await pages.refreshPage({waitUntil: 'domcontentloaded'});
  await expect(pages.conversationPage.page.getByText(text)).toBeVisible({timeout: 10000});
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

export const logOutUser = async (pages: PageManager) => {
  await pages.conversationSidebar.clickPreferencesButton();
  await pages.settingsPage.clickLogoutButton();
  await pages.confirmLogoutModal.clickConfirm();
};

export const sendTextMessageToConversation = async (pages: PageManager, conversation: string, message: string) => {
  await pages.conversationListPage.openConversation(conversation);
  await pages.conversationPage.sendMessage(message);
  expect(await pages.conversationPage.isMessageVisible(message)).toBeTruthy();
};
