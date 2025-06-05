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

import {getUser, User} from './backend/user';
import {AccountPage} from './pages/account.page';
import {AppLockModal} from './pages/appLock.modal';
import {ConversationPage} from './pages/conversation.page';
import {ConversationSidebar} from './pages/conversationSidebar.page';
import {DataShareConsentModal} from './pages/dataShareConsent.modal';
import {LoginPage} from './pages/login.page';
import {SingleSignOnPage} from './pages/singleSignOn.page';
import {test, expect} from './test.fixtures';

const webAppPath = process.env.WEBAPP_URL ?? '';
const createdUsers: User[] = [];
const createdTeams: Map<User, string> = new Map();

test('Account Management', {tag: ['@TC-8639', '@crit-flow']}, async ({page, api}) => {
  const owner = getUser();
  const member = getUser();
  const teamName = 'Critical';
  const conversationName = 'Tracking';
  const appLockPassphrase = 'Aqa123456!';

  await api.createTeamOwner(owner, teamName);
  createdUsers.push(owner);
  const teamId = await api.team.getTeamIdForUser(owner);
  createdTeams.set(owner, teamId);
  const invitationId = await api.team.inviteUserToTeam(
    teamId,
    member.email,
    `${owner.firstName} ${owner.lastName}`,
    owner.token!,
  );
  const invitationCode = await api.brig.getTeamInvitationCodeForEmail(teamId, invitationId);

  await api.createPersonalUser(member, invitationCode);
  await api.conversation.inviteToConversation(member.id!, owner.token!, teamId, conversationName);

  const singleSignOnPage = new SingleSignOnPage(page);
  const loginPage = new LoginPage(page);
  const dataShareConsentModal = new DataShareConsentModal(page);
  const conversationSidebar = new ConversationSidebar(page);
  const accountPage = new AccountPage(page);
  const appLockModal = new AppLockModal(page);
  const conversationPage = new ConversationPage(page);

  await page.goto(webAppPath);
  await singleSignOnPage.enterEmailOnSSOPage(owner.email);
  await loginPage.inputPassword(owner.password);
  await loginPage.clickSignInButton();

  // TODO:
  // zautomation also features the following steps:
  //
  //     When I remember number of reported events
  //     And User <Owner> pinged in the conversation with Tracking
  //     Then There are no added reported events
  //
  // but these are not a part of the original test case, so we skip them here.

  await dataShareConsentModal.clickDecline();
  await conversationSidebar.clickPreferencesButton();
  await accountPage.toggleSendUsageData();
  await accountPage.toggleAppLock();
  await appLockModal.setPasscode(appLockPassphrase);
  await conversationSidebar.clickAllConversationsButton();
  expect(await conversationPage.isConversationVisible(conversationName));

  await page.reload();

  expect(await appLockModal.isVisible());
  expect(await conversationPage.isConversationVisible(conversationName)).toBeFalsy();
  expect(await appLockModal.getAppLockModalHeader()).toContain('Enter passcode to unlock');
  expect(await appLockModal.getAppLockModalText()).toContain('Passcode');

  await appLockModal.unlockAppWithPasscode(appLockPassphrase);
  expect(await appLockModal.isHidden());
  expect(await conversationPage.isConversationVisible(conversationName));

  // TODO: Missing test steps for TC-8639 from testiny:
  // Member changes their email address to a new email address
  // Member resets their password
});

test.afterAll(async ({api}) => {
  for (const [user, teamId] of createdTeams.entries()) {
    await api.team.deleteTeam(user, teamId);
  }
});
