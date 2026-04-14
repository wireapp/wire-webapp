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
import {test, expect, withLogin, withConnectedUser} from 'test/e2e_tests/test.fixtures';
import {createAndSaveBackup, createGroup, loginUser, logOutUser} from 'test/e2e_tests/utils/userActions';
import {generateSecurePassword, generateWireEmail} from '../../utils/userDataGenerator';
import {RequestResetPasswordPage} from '../../pageManager/webapp/pages/requestResetPassword.page';

test.describe('History Backup', () => {
  let userA: User;
  let userB: User;
  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    const team = await createTeam('Test Team', {users: [userB]});
    userA = team.owner;
  });

  test(
    'I want to import a backup that I exported when I was using a different email/password',
    {tag: ['@TC-118', '@regression']},
    async ({createPage, api}, testInfo) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))),
      ]);

      const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;

      const conversationName = 'Test group';
      await createGroup(userAPages, conversationName, [userB]);

      const messageUserA = 'Message from User A';
      const messageUserB = 'Message from User B';

      await test.step('User A and B write messages to each other', async () => {
        await userAPages.conversationList().openConversation(conversationName);
        await userAPages.conversation().sendMessage(messageUserA);
        await userBPages.conversationList().openConversation(conversationName);
        await userBPages.conversation().sendMessage(messageUserB);
      });

      // User A creates Backup
      await userAComponents.conversationSidebar().clickPreferencesButton();
      const backupName = await createAndSaveBackup(testInfo, userAPageManager);

      await test.step('User A changes their Email address', async () => {
        const newEmail = generateWireEmail(userA.firstName, userA.lastName);
        await userAPages.account().changeEmailAddress(newEmail);
        await userAModals.acknowledge().clickAction(); // Acknowledge verify email address modal

        const activationUrl = await api.inbucket.getAccountActivationURL(newEmail);
        await userAPageManager.openNewTab(activationUrl);
        await userAPages.account().isDisplayedEmailEquals(newEmail);
        userA.email = newEmail;
      });

      await test.step('User A changes their Password', async () => {
        const [newPage] = await Promise.all([
          userAPageManager.getContext().waitForEvent('page'),
          userAPages.account().clickResetPasswordButton(),
        ]);

        const resetPasswordPage = new RequestResetPasswordPage(newPage);
        await resetPasswordPage.requestPasswordResetForEmail(userA.email);
        const resetPasswordUrl = await api.inbucket.getResetPasswordURL(userA.email);
        await newPage.close();

        const newPassword = generateSecurePassword();
        userA.password = newPassword;

        await userAPageManager.openUrl(resetPasswordUrl);
        await userAPages.resetPassword().setNewPassword(newPassword);
        await expect(userAPages.resetPassword().passwordChangeMessage).toBeVisible();

        await userAPageManager.page.context().close();
      });

      const newUserAPageManager = PageManager.from(await createPage(withLogin(userA, {confirmNewHistory: true})));

      const {pages: userAPages2, components: userAComponents2} = newUserAPageManager.webapp;

      await userAComponents2.conversationSidebar().clickPreferencesButton();
      await userAPages2.account().backupFileInput.setInputFiles(backupName);

      await test.step('Validate conversation is still visible with all messages after restoring backup', async () => {
        await userAComponents2.conversationSidebar().allConverationsButton.click();
        await userAPages2.conversationList().openConversation(conversationName);
        await expect(userAPages2.conversation().getMessage({sender: userB})).toContainText(messageUserB);
        await expect(userAPages2.conversation().getMessage({sender: userA})).toContainText(messageUserA);
      });
    },
  );

  test(
    "I should not be able to restore from the history of another person's account",
    {tag: ['@TC-125', '@regression']},
    async ({createPage}, testInfo) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))),
      ]);

      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages, components: userBComponents} = userBPageManager.webapp;

      const messageUserA = 'Message from User A';
      const messageUserB = 'Message from User B';

      await test.step('User A and B write messages to each other', async () => {
        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userAPages.conversation().sendMessage(messageUserA);
        await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
        await userBPages.conversation().sendMessage(messageUserB);
      });

      let backupName: string;

      await test.step('User A creates History Backup', async () => {
        await userAComponents.conversationSidebar().clickPreferencesButton();
        backupName = await createAndSaveBackup(testInfo, userAPageManager);
      });

      await test.step("User B tries to restore User A's backup", async () => {
        await logOutUser(userBPageManager, true);
        await loginUser(userB, userBPageManager);
        await userBPages.historyInfo().clickConfirmButton();
        await userBComponents.conversationSidebar().clickPreferencesButton();
        await userBPages.account().backupFileInput.setInputFiles(backupName);
      });

      await test.step('Validate User B cannot import History Backup from User A', async () => {
        const errorHeadline = userBPages.historyImport().title;
        const errorInfo = userBPages.historyImport().description;
        await expect(errorHeadline).toBeVisible();
        await expect(errorHeadline).toHaveText('Wrong backup');
        await expect(errorInfo).toHaveText('You cannot restore history from a different account.');
      });
    },
  );

  test(
    'I want to see new name and system message of the renamed conversation when it was renamed after export',
    {tag: ['@TC-131', '@regression']},
    async ({createPage}, testInfo) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))),
      ]);
      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;

      const conversationName = 'Test group';
      await createGroup(userBPages, conversationName, [userA]);

      const messageUserA = 'Message from User A';
      const messageUserB = 'Message from User B';

      const renamedConversationName = 'renamedConversationName';

      await test.step('User A and B write in their group conversation', async () => {
        await userAPages.conversationList().openConversation(conversationName);
        await userAPages.conversation().sendMessage(messageUserA);
        await userBPages.conversationList().openConversation(conversationName);
        await userBPages.conversation().sendMessage(messageUserB);
      });

      let backupName: string;

      await test.step('User A creates History Backup', async () => {
        await userAComponents.conversationSidebar().clickPreferencesButton();
        backupName = await createAndSaveBackup(testInfo, userAPageManager);
        await userAComponents.conversationSidebar().allConverationsButton.click();
        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      });

      await test.step('User B renames group conversation', async () => {
        await userBPages.conversation().conversationInfoButton.click();
        await userBPages.conversationDetails().changeConversationName(renamedConversationName);
      });

      await test.step('User A restores the Backup', async () => {
        await userAComponents.conversationSidebar().clickPreferencesButton();
        await userAPages.account().backupFileInput.setInputFiles(backupName);
      });

      await test.step('Validate User A sees renamed conversation and system message', async () => {
        // User A sees renamed conversation
        await userAComponents.conversationSidebar().allConverationsButton.click();
        await expect(userAPages.conversationList().getConversationLocator(renamedConversationName)).toBeVisible();

        // User A sees system message that User B had renamed the conversation
        await userAPages.conversationList().openConversation(renamedConversationName);
        const renamedSystemMessage = userAPages
          .conversation()
          .systemMessages.filter({hasText: `${userB.fullName} renamed the conversation`});
        await expect(renamedSystemMessage).toBeVisible();
      });
    },
  );

  test(
    'I want to have the same mute or archive state of a conversation after import',
    {tag: ['@TC-133', '@regression']},
    async ({createPage}, testInfo) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))),
      ]);
      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;

      const conversationName = 'Test group';
      await createGroup(userAPages, conversationName, [userB]);

      const messageUserA = 'Message from User A';
      const messageUserB = 'Message from User B';

      await test.step('User A and B write messages to each other', async () => {
        await userAPages.conversationList().openConversation(conversationName);
        await userAPages.conversation().sendMessage(messageUserA);
        await userBPages.conversationList().openConversation(conversationName);
        await userBPages.conversation().sendMessage(messageUserB);
      });

      await test.step('User A mutes group conversation with User B', async () => {
        await userAPages.conversation().conversationInfoButton.click();
        await userAPages.conversationDetails().setNotifications('Nothing');
      });

      await test.step('User A archives 1:1 conversation with User B', async () => {
        await userAPages.conversationList().openConversation(userB.fullName);
        await userAPages.conversation().conversationInfoButton.click();
        await userAPages.conversationDetails().archiveButton.click();
      });

      let backupName: string;

      await test.step('User A creates History Backup', async () => {
        await userAComponents.conversationSidebar().clickPreferencesButton();
        backupName = await createAndSaveBackup(testInfo, userAPageManager);
      });

      await test.step('User A logs out and logs back in', async () => {
        await logOutUser(userAPageManager, true);
        await loginUser(userA, userAPageManager);
        await userAPages.historyInfo().clickConfirmButton();
      });

      await test.step('User A restores the backup', async () => {
        await userAComponents.conversationSidebar().clickPreferencesButton();
        await userAPages.account().backupFileInput.setInputFiles(backupName);
      });

      await test.step('Validate muted and archived state are the same', async () => {
        await userAComponents.conversationSidebar().allConverationsButton.click();
        await userAPages.conversationList().openConversation(conversationName);
        await expect(
          userAPages.conversationList().getConversationLocator(conversationName).mutedIndicator,
        ).toBeVisible();

        await userAComponents.conversationSidebar().archiveButton.click();
        const archivedConversation = userAPages.conversationList().getConversationLocator(userB.fullName);
        await expect(archivedConversation).toBeVisible();
      });
    },
  );

  test(
    'I should not be able to import a backup with wrong password',
    {tag: ['@TC-135', '@regression']},
    async ({createPage}, testInfo) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))),
      ]);

      const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;

      const messageUserA = 'Message from User A';
      const messageUserB = 'Message from User B';

      await test.step('User A and B write messages to each other', async () => {
        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userAPages.conversation().sendMessage(messageUserA);
        await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
        await userBPages.conversation().sendMessage(messageUserB);
      });

      await test.step('User A creates History Backup and tries to restore it with wrong password', async () => {
        // User A creates History Backup
        await userAComponents.conversationSidebar().clickPreferencesButton();
        const backupName = await createAndSaveBackup(testInfo, userAPageManager, userA.password);

        await logOutUser(userAPageManager, true);
        await loginUser(userA, userAPageManager);

        // User A tries to restore backup with wrong password
        await userAPages.historyInfo().clickConfirmButton();
        await userAComponents.conversationSidebar().clickPreferencesButton();
        await userAPages.account().backupFileInput.setInputFiles(backupName);
        await userAModals.passwordAdvancedSecurity().enterPassword('wrongPassword1.');
        await userAModals.passwordAdvancedSecurity().clickAction();

        const errorHeadline = userAPages.historyImport().title;
        const errorInfo = userAPages.historyImport().description;
        await expect(errorHeadline).toBeVisible();
        await expect(errorHeadline).toHaveText('Wrong Password');
        await expect(errorInfo).toHaveText('Please verify your input and try again');
      });
    },
  );

  test(
    'I should not see the deleted group after restore from the backup',
    {tag: ['@TC-1097', '@regression']},
    async ({createPage}, testInfo) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))),
      ]);
      const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;

      const conversationName = 'Test group';
      await createGroup(userAPages, conversationName, [userB]);

      const messageUserA = 'Message from User A';
      const messageUserB = 'Message from User B';

      await test.step('User A and User B write messages to each other', async () => {
        await userAPages.conversationList().openConversation(conversationName);
        await userAPages.conversation().sendMessage(messageUserA);
        await userBPages.conversationList().openConversation(conversationName);
        await userBPages.conversation().sendMessage(messageUserB);
      });

      await test.step('User A deletes group conversation with User B', async () => {
        await userAPages.conversation().conversationInfoButton.click();
        await userAPages.conversationDetails().deleteGroupButton.click();
        await expect(userAModals.confirm().modalTitle).toContainText('Delete group conversation?');
        await userAModals.confirm().clickAction();
      });

      await test.step('User A creates History Backup', async () => {
        await userAComponents.conversationSidebar().clickPreferencesButton();
        const backupName = await createAndSaveBackup(testInfo, userAPageManager);

        await logOutUser(userAPageManager, true);
        await loginUser(userA, userAPageManager);
        await userAPages.historyInfo().clickConfirmButton();
        await userAComponents.conversationSidebar().clickPreferencesButton();
        await userAPages.account().backupFileInput.setInputFiles(backupName);
      });

      await test.step('Validate deleted group conversation is no longer visible', async () => {
        await userAComponents.conversationSidebar().allConverationsButton.click();
        await expect(userAPages.conversationList().getConversationLocator(conversationName)).not.toBeVisible();
      });
    },
  );
});
