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

import {expect, test, withLogin} from '../../test.fixtures';
import {generateSecurePassword, generateWireEmail} from '../../utils/userDataGenerator';
import {loginUser} from 'test/e2e_tests/utils/userActions';

const appLockPassphrase = generateSecurePassword();

test('Account Management', {tag: ['@TC-8639', '@crit-flow-web']}, async ({createUser, createPage, api}) => {
  const user = await createUser();
  const pageManager = PageManager.from(await createPage(withLogin(user)));
  const {pages, modals, components} = pageManager.webapp;

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
  });

  await test.step('Member verifies if applock is working', async () => {
    await pageManager.refreshPage();
    await expect(modals.appLock().appLockModalHeader).toContainText('Enter passcode to unlock');
    await expect(modals.appLock().appLockModalText).toContainText('Passcode');

    await modals.appLock().unlockAppWithPasscode(appLockPassphrase);
  });

  await components.conversationSidebar().clickPreferencesButton();

  await test.step('Member changes their email address to a new email address', async () => {
    const newEmail = generateWireEmail(user.lastName);
    await pages.account().changeEmailAddress(newEmail);
    await modals.acknowledge().clickAction(); // Acknowledge verify email address modal

    const activationUrl = await api.inbucket.getAccountActivationURL(newEmail);
    await pageManager.openNewTab(activationUrl);
    await pages.account().isDisplayedEmailEquals(newEmail);
    user.email = newEmail;
  });

  await test.step('Member changes audio device settings', async () => {
    const fakeAudioInput = 'Fake Audio Input 1';
    const fakeAudioOutput = 'Fake Audio Output 1';
    const fakeCamera = 'Fake Camera 1';

    await pages.settings().clickAudioVideoSettingsButton();
    await pages.audioVideoSettings().selectMicrophone(fakeAudioInput);
    await pages.audioVideoSettings().selectSpeaker(fakeAudioOutput);
    await pages.audioVideoSettings().selectCamera(fakeCamera);
    expect(await pages.audioVideoSettings().isMicrophoneSetTo(fakeAudioInput));
    expect(await pages.audioVideoSettings().isSpeakerSetTo(fakeAudioOutput));
    expect(await pages.audioVideoSettings().isCameraSetTo(fakeCamera));
  });

  await test.step('Member turns off data consent', async () => {
    await pages.settings().clickAccountButton();
    await pages.account().toggleReceiveNewsletter();
    await expect(pages.account().receiveNewsletterCheckbox).toBeChecked();
  });

  await test.step('Member resets their password ', async () => {
    const [newPage] = await Promise.all([
      pageManager.getContext().waitForEvent('page'), // Wait for the new tab
      pages.account().clickResetPasswordButton(),
    ]);

    const resetPasswordPageManager = PageManager.from(newPage);
    const resetPasswordPage = resetPasswordPageManager.webapp.pages.requestResetPassword();
    await resetPasswordPage.requestPasswordResetForEmail(user.email);
    const resetPasswordUrl = await api.inbucket.getResetPasswordURL(user.email);
    await newPage.close(); // Close the new tab

    const newPassword = generateSecurePassword();
    user.password = newPassword; // Update member's password for password reset

    await pageManager.openUrl(resetPasswordUrl);
    await pages.resetPassword().setNewPassword(newPassword);
    await pages.resetPassword().isPasswordChangeMessageVisible();

    // Logging in with the new password
    await pageManager.openMainPage();
    await loginUser(user, pageManager);
    await modals.appLock().unlockAppWithPasscode(appLockPassphrase);

    await expect(components.conversationSidebar().personalUserName).toContainText(user.username);
    await expect(components.conversationSidebar().personalStatusName).toContainText(
      `${user.firstName} ${user.lastName}`,
    );
  });
});
