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

import {PageManager} from 'test/e2e_tests/pageManager';
import {addMockCamerasToContext} from 'test/e2e_tests/utils/mockVideoDevice.util';
import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDown.util';

import {getUser} from '../../data/user';
import {expect, test} from '../../test.fixtures';
import {loginUser} from '../../utils/userActions';
import {generateSecurePassword, generateWireEmail} from '../../utils/userDataGenerator';

// Generating test data
let owner = getUser();
const newEmail = generateWireEmail(owner.lastName);
const member = getUser();
const teamName = 'Critical';
const conversationName = 'Tracking';
const appLockPassphrase = generateSecurePassword();

test('Account Management', {tag: ['@TC-8639', '@crit-flow-web']}, async ({pageManager, api}) => {
  // Add fake video devices to the browser context
  await addMockCamerasToContext(pageManager.getContext());

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
    await pageManager.refreshPage({waitUntil: 'domcontentloaded'});
    expect(await modals.appLock().isVisible());
    expect(await modals.appLock().getAppLockModalHeader()).toContain('Enter passcode to unlock');
    expect(await modals.appLock().getAppLockModalText()).toContain('Passcode');

    await modals.appLock().unlockAppWithPasscode(appLockPassphrase);
    expect(await modals.appLock().isHidden());
    expect(await pages.conversationList().isConversationItemVisible(conversationName));
  });

  await test.step('Member changes their email address to a new email address', async () => {
    await components.conversationSidebar().clickPreferencesButton();
    await pages.account().changeEmailAddress(newEmail);
    await modals.acknowledge().clickAction(); // Acknowledge verify email address modal

    const activationUrl = await api.inbucket.getAccountActivationURL(newEmail);
    await pageManager.openNewTab(activationUrl);
    await pages.account().isDisplayedEmailEquals(newEmail);
  });

  await test.step('Member changes audio device settings', async () => {
    const fakeAudioInput = 'Fake Audio Input 1';
    const fakeAudioOutput = 'Fake Audio Output 1';
    const fakeCamera = 'Fake Camera 1';

    await pages.settings().clickAudioVideoSettingsButton();
    await pages.audioVideoSettings().selectMicrophone(fakeAudioInput);
    await pages.audioVideoSettings().selectSpeaker(fakeAudioOutput);
    await pages.audioVideoSettings().selectCamera(fakeCamera);
    expect(await pages.audioVideoSettings().isMicrophoneSetTo('Fake Audio Input 1'));
    expect(await pages.audioVideoSettings().isSpeakerSetTo('Fake Audio Output 1'));
    expect(await pages.audioVideoSettings().isCameraSetTo(fakeCamera));
  });

  await test.step('Member turns off data consent', async () => {
    await pages.settings().clickAccountButton();
    await pages.account().toggleReceiveNewsletter();
    expect(await pages.account().isReceiveNewsletterEnabled()).toBeFalsy();
  });

  await test.step('Member resets their password ', async () => {
    const [newPage] = await Promise.all([
      pageManager.getContext().waitForEvent('page'), // Wait for the new tab
      pages.account().clickResetPasswordButton(),
    ]);

    const resetPasswordPageManager = PageManager.from(newPage);
    const resetPasswordPage = resetPasswordPageManager.webapp.pages.requestResetPassword();
    await resetPasswordPage.requestPasswordResetForEmail(newEmail);
    const resetPasswordUrl = await api.inbucket.getResetPasswordURL(newEmail);
    await newPage.close(); // Close the new tab

    const newPassword = generateSecurePassword();
    member.password = newPassword; // Update member's password for password reset

    await pageManager.openUrl(resetPasswordUrl);
    await pages.resetPassword().setNewPassword(newPassword);
    await pages.resetPassword().isPasswordChangeMessageVisible();

    // Logging in with the new password
    // Bug [WPB-19061] Getting 403 (/access) and 401 (/self) after trying to open main page after resetting passwowrd. Also it looks like endless empty loading screen and nothing happens

    //   await pageManager.openMainPage();
    //   await loginUser(member, pageManager);
    //   await modals.dataShareConsent().clickDecline();

    //   expect(await components.conversationSidebar().getPersonalStatusName()).toBe(
    //     `${member.firstName} ${member.lastName}`,
    //   );
    //   expect(await components.conversationSidebar().getPersonalUserName()).toContain(member.username);
  });
});

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, owner);
});
