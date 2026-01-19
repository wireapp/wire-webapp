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

import {getUser} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';

import {test, expect, withLogin} from '../../test.fixtures';

test('Personal Account Lifecycle', {tag: ['@TC-8638', '@crit-flow-web']}, async ({createPage, createUser, api}) => {
  // Create user A as a personal user (who will register in the test)
  const userA = getUser();
  // Create users B and C as personal users with login
  const userB = await createUser();
  const userC = await createUser();

  const [pageManagerA, pageManagerB, pageManagerC] = await Promise.all([
    PageManager.from(createPage()), // Create page for User A (who will register in the test)
    PageManager.from(createPage(withLogin(userB))),
    PageManager.from(createPage(withLogin(userC))),
  ]);

  await test.step('User A opens the application and registers personal account', async () => {
    const {pages, modals} = pageManagerA.webapp;
    await pageManagerA.openMainPage();
    await pages.singleSignOn().enterEmailOnSSOPage(userA.email);
    await pages.welcome().clickCreateAccountButton();
    await pages.welcome().clickCreatePersonalAccountButton();
    await expect(pages.registration().passwordPolicyInfo).toContainText(
      'Use at least 8 characters, with one lowercase letter, one capital letter, a number, and a special character.',
    );

    await pages.registration().fillInUserInfo(userA);
    await expect(pages.registration().submitButton).toBeDisabled();

    await pages.registration().toggleTermsCheckbox();
    await expect(pages.registration().submitButton).toBeEnabled();

    await pages.registration().clickSubmitButton();
    const verificationCode = await api.brig.getActivationCodeForEmail(userA.email);

    await expect(pages.emailVerification().verificationCodeInputLabel).toBeVisible();
    await pages.emailVerification().enterVerificationCode(verificationCode);
    await modals.marketingConsent().clickConfirmButton();
  });

  await test.step('Personal user A sets user name', async () => {
    const {pages} = pageManagerA.webapp;
    await pages.setUsername().setUsername(userA.username);
    await pages.setUsername().clickNextButton();
    await pages.registerSuccess().clickOpenWireWebButton();
  });

  await test.step('Personal user A declines sending anonymous usage data', async () => {
    const {modals} = pageManagerA.webapp;
    await modals.dataShareConsent().clickDecline();
  });

  await test.step('Personal user A checks that username was set correctly', async () => {
    const {pages, components} = pageManagerA.webapp;
    await expect(components.conversationSidebar().personalStatusName).toHaveText(
      `${userA.firstName} ${userA.lastName}`,
    );
    await expect(components.conversationSidebar().personalUserName).toContainText(userA.username);
    await expect(pages.conversation().watermark).toBeVisible();
  });

  await test.step('Personal user A searches for other personal user B', async () => {
    const {pages, modals, components} = pageManagerA.webapp;
    await components.conversationSidebar().clickConnectButton();
    await pages.startUI().selectUsers(userB.username);
    await expect(modals.userProfile().modal).toBeVisible();
  });

  await test.step('Personal user A sends a connection request to personal user B', async () => {
    const {pages, modals} = pageManagerA.webapp;
    await modals.userProfile().clickConnectButton();
    await pages.conversationList().openConversation(userB.fullName);
    await expect(pages.outgoingConnection().uniqueUsernameOutgoing).toContainText(userB.username);
    await expect(pages.outgoingConnection().getPendingConnectionIconLocator(userB.fullName)).toBeVisible();
  });

  await test.step('Personal user B accepts request from A', async () => {
    await pageManagerB.webapp.pages.conversationList().openPendingConnectionRequest();
    await pageManagerB.webapp.pages.connectRequest().clickConnectButton();
    await expect(pageManagerB.webapp.pages.conversationList().getConversationLocator(userA.fullName)).toBeVisible();
  });

  await test.step('Personal user A send message to personal user B', async () => {
    const {pages} = pageManagerA.webapp;
    await pages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await pages.conversation().sendMessage(`Hello! ${userA.firstName} here.`);
  });

  await test.step('Personal user B can see the message from user A', async () => {
    await pageManagerB.webapp.pages.conversationList().openConversation(userA.fullName);
    await expect(
      pageManagerB.webapp.pages.conversation().getMessage({content: `Hello! ${userA.firstName} here.`}),
    ).toBeVisible();
  });

  await test.step('Personal user A blocks personal user B', async () => {
    const {pages, modals} = pageManagerA.webapp;
    const conversation = pages.conversationList().getConversationLocator(userB.fullName);

    await expect(conversation).not.toContainText('Blocked');
    await pages.conversationList().clickConversationOptions(userB.fullName);
    await pages.conversationList().clickBlockConversation();
    await expect(modals.blockWarning().modal).toBeVisible();
    await expect(modals.blockWarning().modalTitle).toContainText(`Block ${userB.fullName}`);
    await expect(modals.blockWarning().modalText).toContainText(
      `${userB.fullName} won’t be able to contact you or add you to group conversations.`,
    );

    await modals.blockWarning().clickBlock();
    await expect(conversation).toContainText('Blocked');
  });

  await test.step('Personal user C sends a connection request to personal user A', async () => {
    await pageManagerC.webapp.components.conversationSidebar().clickConnectButton();
    await pageManagerC.webapp.pages.startUI().selectUsers(userA.username);
    await pageManagerC.webapp.modals.userProfile().clickConnectButton();
    await pageManagerC.webapp.pages.conversationList().openConversation(userA.fullName);
    await expect(pageManagerC.webapp.pages.outgoingConnection().uniqueUsernameOutgoing).toContainText(userA.username);
    await expect(
      pageManagerC.webapp.pages.outgoingConnection().getPendingConnectionIconLocator(userA.fullName),
    ).toBeVisible();
  });

  await test.step('Personal user A accepts request from C', async () => {
    const {pages} = pageManagerA.webapp;
    await pages.conversationList().openPendingConnectionRequest();
    await pages.connectRequest().clickConnectButton();
  });

  await test.step('Personal user A send message to personal user C', async () => {
    const {pages} = pageManagerA.webapp;
    await pages.conversationList().openConversation(userC.fullName, {protocol: 'mls'});
    await pages.conversation().sendMessage(`Hello! ${userA.firstName} here.`);
  });

  await test.step('Personal user C can see the message from user A', async () => {
    await pageManagerC.webapp.pages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await expect(
      pageManagerC.webapp.pages.conversation().getMessage({content: `Hello! ${userA.firstName} here.`}),
    ).toBeVisible();
  });

  await test.step('Personal User A deletes their account', async () => {
    const {pages, modals, components} = pageManagerA.webapp;
    await components.conversationSidebar().clickPreferencesButton();
    await pages.account().clickDeleteAccountButton();
    await expect(modals.deleteAccount().modal).toBeVisible();
    await expect(modals.deleteAccount().modalTitle).toContainText('Delete account');
    await expect(modals.deleteAccount().modalText).toContainText(
      'We will send you an email. Follow the link to delete your account permanently.',
    );

    await modals.deleteAccount().clickDelete();
    const url = await api.inbucket.getAccountDeletionURL(userA.email);

    await pageManagerA.openNewTab(url, async tab => {
      await tab.webapp.pages.deleteAccount().deleteAccountButton.click();
      await expect(tab.webapp.pages.deleteAccount().accountDeletedHeadline).toContainText('Account deleted');
    });
  });
});
