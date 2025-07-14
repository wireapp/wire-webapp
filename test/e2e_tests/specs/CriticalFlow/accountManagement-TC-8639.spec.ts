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

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';
import {addCreatedTeam, tearDown} from '../../utils/tearDownUtil';
import {loginUser} from '../../utils/userActions';
import {generateSecurePassword} from '../../utils/userDataGenerator';

test('Account Management', {tag: ['@TC-8639', '@crit-flow']}, async ({pages, api}) => {
  test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

  // Generating test data
  const owner = getUser();
  const member = getUser();
  const teamName = 'Critical';
  const conversationName = 'Tracking';
  const appLockPassphrase = generateSecurePassword();

  // Creating preconditions for the test via API
  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createTeamOwner(owner, teamName);
    if (!owner.token) {
      throw new Error(`Owner ${owner.username} has no token and can't be used for team creation`);
    }
    const teamId = await api.team.getTeamIdForUser(owner);
    addCreatedTeam(owner, teamId);
    const invitationId = await api.team.inviteUserToTeam(member.email, owner);
    const invitationCode = await api.brig.getTeamInvitationCodeForEmail(teamId, invitationId);

    await api.createPersonalUser(member, invitationCode);
    if (!member.id) {
      throw new Error(`Member ${member.username} has no ID and can't be invited to the conversation`);
    }
    await api.conversation.inviteToConversation(member.id, owner.token, teamId, conversationName);
  });

  // Test steps
  await test.step('Members logs in into the application', async () => {
    await loginUser(member, pages);
  });

  await test.step('Member opens settings', async () => {
    await pages.conversationSidebar.clickPreferencesButton();
  });

  await test.step('Member enables logging in settings', async () => {
    await pages.accountPage.toggleSendUsageData();
  });

  await test.step('Member enables applock and sets their password', async () => {
    await pages.accountPage.toggleAppLock();
    await pages.appLockModal.setPasscode(appLockPassphrase);
    await pages.conversationSidebar.clickAllConversationsButton();
    expect(await pages.conversationListPage.isConversationItemVisible(conversationName));
  });

  await test.step('Member verifies if applock is working', async () => {
    await pages.refreshPage();
    expect(await pages.appLockModal.isVisible());
    expect(await pages.appLockModal.getAppLockModalHeader()).toContain('Enter passcode to unlock');
    expect(await pages.appLockModal.getAppLockModalText()).toContain('Passcode');

    await pages.appLockModal.unlockAppWithPasscode(appLockPassphrase);
    expect(await pages.appLockModal.isHidden());
    expect(await pages.conversationListPage.isConversationItemVisible(conversationName));
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
  await tearDown(api);
});
