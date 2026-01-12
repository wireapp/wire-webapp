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

import {removeCreatedUser} from 'test/e2e_tests/utils/tearDown.util';
import {loginUser, logOutUser} from 'test/e2e_tests/utils/userActions';

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';

// Generating test data
const userA = getUser();
const userB = getUser();
const groupName = 'Critical Group';
const personalMessage = 'Hello, this is a personal message!';
const groupMessage = 'This is a group message!';
let backupName: string;
let passwordProtectedBackupName: string;

test('Setting up new device with a backup', {tag: ['@TC-8634', '@crit-flow-web']}, async ({pageManager, api}) => {
  const {pages, modals, components} = pageManager.webapp;

  const createAndSaveBackup = async (password?: string, filenamePrefix?: string): Promise<string> => {
    await pages.account().clickBackUpButton();
    expect(modals.passwordAdvancedSecurity().isTitleVisible()).toBeTruthy();
    if (password) {
      await modals.passwordAdvancedSecurity().enterPassword(password);
    }
    await modals.passwordAdvancedSecurity().clickBackUpNow();
    expect(modals.passwordAdvancedSecurity().isTitleHidden()).toBeTruthy();
    expect(pages.historyExport().isVisible()).toBeTruthy();
    const [download] = await Promise.all([
      pages.historyExport().page.waitForEvent('download'),
      pages.historyExport().clickSaveFileButton(),
    ]);
    const backupName = `./test-results/downloads/${filenamePrefix}${download.suggestedFilename()}`;
    await download.saveAs(backupName);
    return backupName;
  };

  // Creating preconditions for the test via API
  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createPersonalUser(userA);
    await api.createPersonalUser(userB);
    await api.connectUsers(userA, userB);
  });

  // Test steps
  await test.step('User logs in', async () => {
    await pageManager.openMainPage();
    await loginUser(userA, pageManager);
    await modals.dataShareConsent().clickDecline();
  });

  await test.step('User generates data', async () => {
    await pages.conversationList().openConversation(userB.fullName);
    await pages.conversation().sendMessage(personalMessage);
    await expect(pages.conversation().getMessage({content: personalMessage})).toBeVisible();

    await pages.conversationList().clickCreateGroup();
    await pages.groupCreation().setGroupName(groupName);
    await pages.startUI().selectUsers(userB.username);
    await pages.groupCreation().clickCreateGroupButton();
    await pages.conversationList().openConversation(groupName);
    await pages.conversation().sendMessage(groupMessage);

    await expect(pages.conversation().getMessage({content: groupMessage})).toBeVisible();
  });

  await test.step('User creates and saves a backup', async () => {
    await components.conversationSidebar().clickPreferencesButton();
    backupName = await createAndSaveBackup();
  });

  await test.step('User creates and saves a password backup', async () => {
    passwordProtectedBackupName = await createAndSaveBackup(userA.password, 'password-');
  });

  await test.step('User logs out and clears all data', async () => {
    await logOutUser(pageManager, true);
  });

  await test.step('User logs back in', async () => {
    await loginUser(userA, pageManager);
    await pages.historyInfo().clickConfirmButton();
  });

  await test.step('User doesnt see previous data (messages)', async () => {
    await pages.conversationList().openConversation(userB.fullName);
    await expect(pages.conversation().getMessage({content: personalMessage})).not.toBeVisible();

    await pages.conversationList().openConversation(groupName);
    await expect(pages.conversation().getMessage({content: groupMessage})).not.toBeVisible();
  });

  await test.step('User restores the previously created backup', async () => {
    await components.conversationSidebar().clickPreferencesButton();
    await pages.account().backupFileInput.setInputFiles(backupName);
    expect(pages.historyImport().importSuccessHeadline.isVisible()).toBeTruthy();
  });

  await test.step('User restores the previously created password protected backup', async () => {
    await components.conversationSidebar().clickPreferencesButton();
    await pages.account().backupFileInput.setInputFiles(passwordProtectedBackupName);
    await expect(modals.passwordAdvancedSecurity().modalTitle).toBeVisible();
    await modals.passwordAdvancedSecurity().enterPassword(userA.password);
    await modals.passwordAdvancedSecurity().clickAction();
    await expect(modals.passwordAdvancedSecurity().modalTitle).not.toBeVisible();
    expect(pages.historyImport().importSuccessHeadline.isVisible()).toBeTruthy();
  });

  await test.step('All data (chat history, contacts) are restored', async () => {
    await components.conversationSidebar().clickAllConversationsButton();
    await pages.conversationList().openConversation(groupName);
    await expect(pages.conversation().getMessage({content: groupMessage})).toBeVisible();

    await pages.conversationList().openConversation(userB.fullName);
    await expect(pages.conversation().getMessage({content: personalMessage})).toBeVisible();
  });
});

test.afterAll(async ({api}) => {
  await removeCreatedUser(api, userA);
  await removeCreatedUser(api, userB);
});
