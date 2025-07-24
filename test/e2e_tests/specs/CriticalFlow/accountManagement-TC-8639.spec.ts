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

import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDown.util';

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';
import {loginUser} from '../../utils/userActions';
import {generateSecurePassword} from '../../utils/userDataGenerator';

// Generating test data
let owner = getUser();
const member = getUser();
const teamName = 'Critical';
const conversationName = 'Tracking';
const appLockPassphrase = generateSecurePassword();

test('Account Management', {tag: ['@TC-8639', '@crit-flow-web']}, async ({pageManager, api}) => {
  test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

  const {pages, modals, components} = pageManager.webapp;

  // Creating preconditions for the test via API
  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    const user = await api.createTeamOwner(owner, teamName);
    if (!owner.token) {
      throw new Error(`Owner ${owner.username} has no token and can't be used for team creation`);
    }
    owner = {...owner, ...user};
    addCreatedTeam(owner, owner.teamId);
    const invitationId = await api.team.inviteUserToTeam(member.email, owner);
    const invitationCode = await api.brig.getTeamInvitationCodeForEmail(owner.teamId, invitationId);

    await api.createPersonalUser(member, invitationCode);
    if (!member.id) {
      throw new Error(`Member ${member.username} has no ID and can't be invited to the conversation`);
    }
    await api.conversation.inviteToConversation(member.id, owner.token, owner.teamId, conversationName);
  });

  // Test steps
  await test.step('Members logs in into the application', async () => {
    await pageManager.openMainPage();
    await loginUser(member, pageManager);
    await modals.dataShareConsent().clickDecline();
  });

  await test.step('Member opens settings', async () => {
    await components.conversationSidebar().clickPreferencesButton();
  });

  await test.step('Member enables logging in settings', async () => {
    await pages.account().toggleSendUsageData();
  });

  await test.step('Member enables applock and sets their password', async () => {
    await pages.account().toggleAppLock();
    await modals.appLock().setPasscode(appLockPassphrase);
    await components.conversationSidebar().clickAllConversationsButton();
    expect(await pages.conversationList().isConversationItemVisible(conversationName));
  });

  await test.step('Member verifies if applock is working', async () => {
    await pageManager.refreshPage();
    expect(await modals.appLock().isVisible());
    expect(await modals.appLock().getAppLockModalHeader()).toContain('Enter passcode to unlock');
    expect(await modals.appLock().getAppLockModalText()).toContain('Passcode');

    await modals.appLock().unlockAppWithPasscode(appLockPassphrase);
    expect(await modals.appLock().isHidden());
    expect(await pages.conversationList().isConversationItemVisible(conversationName));
  });

  // TODO: Missing test steps for TC-8639 from testiny:
  // Member changes their email address to a new email address
  // Member resets their password
  //
  // These steps were not implemented in zautomation, so I skipped them here for the time being.
  await test.step('Member changes their email address to a new email address', async () => {});

  await test.step('Member resets their password ', async () => {});
});

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, owner);
});
