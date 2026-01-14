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
import {addMockCamerasToContext} from 'test/e2e_tests/utils/mockVideoDevice.util';

import {expect, test, withLogin} from '../../test.fixtures';
import {generateSecurePassword, generateWireEmail} from '../../utils/userDataGenerator';
import {loginUser} from 'test/e2e_tests/utils/userActions';

// Generating test data
const conversationName = 'Tracking';

test('Account Management', {tag: ['@TC-8639', '@crit-flow-web']}, async ({createTeam, createPage, api}) => {
  let owner: User;
  let member: User;
  let memberPageManager: PageManager;
  let newEmail: string;
  let appLockPassphrase: string;

  // Creating preconditions for the test via API
  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    const team = await createTeam('Critical', {withMembers: 1});
    owner = team.owner;
    member = team.members[0];

    newEmail = generateWireEmail(owner.lastName);
    appLockPassphrase = generateSecurePassword();

    if (!member.id) {
      throw new Error(`Member ${member.username} has no ID and can't be invited to the conversation`);
    }
    if (!owner.token) {
      throw new Error(`Owner ${owner.username} has no token and can't be used for team operations`);
    }

    await api.conversation.inviteToConversation(member.id, owner.token, owner.teamId, conversationName);

    memberPageManager = await PageManager.from(createPage(withLogin(member)));
    // Add fake video devices to the browser context
    await addMockCamerasToContext(memberPageManager.getContext());
  });

  // Test steps
  await test.step('Member opens settings', async () => {
    const {components} = memberPageManager.webapp;
    await components.conversationSidebar().clickPreferencesButton();
  });

  await test.step('Member enables logging in settings', async () => {
    const {pages} = memberPageManager.webapp;
    await pages.account().toggleSendUsageData();
  });

  await test.step('Member enables applock and sets their password', async () => {
    const {pages, modals, components} = memberPageManager.webapp;
    await pages.account().toggleAppLock();
    await modals.appLock().setPasscode(appLockPassphrase);
    await components.conversationSidebar().clickAllConversationsButton();
    expect(await pages.conversationList().isConversationItemVisible(conversationName));
  });

  await test.step('Member verifies if applock is working', async () => {
    const {pages, modals} = memberPageManager.webapp;
    await memberPageManager.refreshPage({waitUntil: 'domcontentloaded'});
    expect(await modals.appLock().isVisible());
    expect(await modals.appLock().getAppLockModalHeader()).toContain('Enter passcode to unlock');
    expect(await modals.appLock().getAppLockModalText()).toContain('Passcode');

    await modals.appLock().unlockAppWithPasscode(appLockPassphrase);
    expect(await modals.appLock().isHidden());
    expect(await pages.conversationList().isConversationItemVisible(conversationName));
  });

  await test.step.skip('Member changes their email address to a new email address', async () => {
    const {pages, modals, components} = memberPageManager.webapp;
    await components.conversationSidebar().clickPreferencesButton();
    await pages.account().changeEmailAddress(newEmail);
    await modals.acknowledge().clickAction(); // Acknowledge verify email address modal

    const activationUrl = await api.inbucket.getAccountActivationURL(newEmail);
    await memberPageManager.openNewTab(activationUrl);
    await pages.account().isDisplayedEmailEquals(newEmail);
  });

  await test.step('Member changes audio device settings', async () => {
    const {pages, components} = memberPageManager.webapp;
    await components.conversationSidebar().clickPreferencesButton();
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
    const {pages} = memberPageManager.webapp;
    await pages.settings().clickAccountButton();
    await pages.account().toggleReceiveNewsletter();
    expect(await pages.account().isReceiveNewsletterEnabled()).toBeFalsy();
  });

  await test.step('Member resets their password ', async () => {
    const {pages, modals, components} = memberPageManager.webapp;
    const [newPage] = await Promise.all([
      memberPageManager.getContext().waitForEvent('page'), // Wait for the new tab
      pages.account().clickResetPasswordButton(),
    ]);

    const resetPasswordPageManager = PageManager.from(newPage);
    const resetPasswordPage = resetPasswordPageManager.webapp.pages.requestResetPassword();
    await resetPasswordPage.requestPasswordResetForEmail(member.email);
    const resetPasswordUrl = await api.inbucket.getResetPasswordURL(member.email);
    await newPage.close(); // Close the new tab

    const newPassword = generateSecurePassword();
    member.password = newPassword; // Update member's password for password reset

    await memberPageManager.openUrl(resetPasswordUrl);
    await pages.resetPassword().setNewPassword(newPassword);
    await pages.resetPassword().isPasswordChangeMessageVisible();

    // Logging in with the new password
    await memberPageManager.openMainPage();
    await loginUser(member, memberPageManager);
    await modals.appLock().unlockAppWithPasscode(appLockPassphrase);

    await expect(components.conversationSidebar().personalStatusLabel).toContainText(
      `${member.firstName} ${member.lastName}`,
    );
    await expect(components.conversationSidebar().personalUserName).toContainText(member.username);
  });
});
