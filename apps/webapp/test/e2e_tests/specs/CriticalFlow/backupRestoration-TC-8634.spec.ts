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

import {createAndSaveBackup, createGroup, loginUser, logOutUser} from 'test/e2e_tests/utils/userActions';

import {User} from '../../data/user';
import {test, expect, withLogin, withConnectedUser, LOGIN_TIMEOUT} from '../../test.fixtures';
import {PageManager} from 'test/e2e_tests/pageManager';

const groupName = 'Critical Group';
const personalMessage = 'Hello, this is a personal message!';
const groupMessage = 'This is a group message!';
let backupName: string;
let passwordProtectedBackupName: string;

let userA: User;
let userB: User;
test.beforeEach(async ({createTeam, createUser}) => {
  userB = await createUser();
  const team = await createTeam('Test Team', {users: [userB]});
  userA = team.owner;
});

test('Setting up new device with a backup', {tag: ['@TC-8634', '@crit-flow-web']}, async ({createPage}, testInfo) => {
  const pageManager = PageManager.from(await createPage(withLogin(userA), withConnectedUser(userB)));
  const {pages, modals, components} = pageManager.webapp;

  const userBConversation = pages.conversationList().getConversation(userB.fullName);
  const groupConversation = pages.conversationList().getConversation(groupName);

  await test.step('User generates data', async () => {
    await userBConversation.open();
    await pages.conversation().sendMessage(personalMessage);
    await expect(pages.conversation().getMessage({content: personalMessage})).toBeVisible();

    await createGroup(pages, groupName, [userB]);
    await groupConversation.open();
    await pages.conversation().sendMessage(groupMessage);

    await expect(pages.conversation().getMessage({content: groupMessage})).toBeVisible();
  });

  await test.step('User creates and saves a backup', async () => {
    await components.conversationSidebar().clickPreferencesButton();
    backupName = await createAndSaveBackup(testInfo, pageManager);
  });

  await test.step('User creates and saves a password backup', async () => {
    passwordProtectedBackupName = await createAndSaveBackup(testInfo, pageManager, userA.password, 'password-');
  });

  await test.step('User logs out and clears all data', async () => {
    await logOutUser(pageManager, true);
  });

  await test.step('User logs back in', async () => {
    await loginUser(userA, pageManager);
    await pages.historyInfo().clickConfirmButton();
    await components.conversationSidebar().sidebar.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
  });

  await test.step("User doesn't see previous data (messages)", async () => {
    await userBConversation.open();
    await expect(pages.conversation().getMessage({content: personalMessage})).not.toBeVisible();

    await groupConversation.open();
    await expect(pages.conversation().getMessage({content: groupMessage})).not.toBeVisible();
  });

  await test.step('User restores the previously created backup', async () => {
    await components.conversationSidebar().clickPreferencesButton();
    await pages.account().backupFileInput.setInputFiles(backupName);
    await expect(pages.historyImport().title).toContainText('History restored');
  });

  await test.step('User restores the previously created password protected backup', async () => {
    await components.conversationSidebar().clickPreferencesButton();
    await pages.account().backupFileInput.setInputFiles(passwordProtectedBackupName);
    await expect(modals.passwordAdvancedSecurity().modalTitle).toBeVisible();

    await modals.passwordAdvancedSecurity().enterPassword(userA.password);
    await modals.passwordAdvancedSecurity().clickAction();
    await expect(modals.passwordAdvancedSecurity().modalTitle).not.toBeVisible();
    await expect(pages.historyImport().title).toContainText('History restored');
  });

  await test.step('All data (chat history, contacts) are restored', async () => {
    await components.conversationSidebar().clickAllConversationsButton();
    await groupConversation.open();
    await expect(pages.conversation().getMessage({content: groupMessage})).toBeVisible();

    await userBConversation.open();
    await expect(pages.conversation().getMessage({content: personalMessage})).toBeVisible();
  });
});
