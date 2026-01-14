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

import {getUser, User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {sendTextMessageToUser} from 'test/e2e_tests/utils/userActions';

import {test, expect, withLogin} from '../../test.fixtures';

test('Personal Account Lifecycle', {tag: ['@TC-8638', '@crit-flow-web']}, async ({createPage, createUser, api}) => {
  let pageManager: PageManager;
  let pageManagerB: PageManager;
  let pageManagerC: PageManager;
  let userA: User;
  let userB: User;
  let userC: User;

  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    // Create user A as a personal user (who will register in the test)
    userA = getUser();
    // Create users B and C as personal users with login
    userB = await createUser();
    userC = await createUser();

    const [pmB, pmC] = await Promise.all([
      PageManager.from(createPage(withLogin(userB))),
      PageManager.from(createPage(withLogin(userC))),
    ]);

    pageManagerB = pmB;
    pageManagerC = pmC;

    // Create page for User A (who will register in the test)
    pageManager = PageManager.from(await createPage());
  });

  await test.step('User A opens the application and registers personal account', async () => {
    const {pages, modals} = pageManager.webapp;
    await pageManager.openMainPage();
    await pages.singleSignOn().enterEmailOnSSOPage(userA.email);
    await pages.welcome().clickCreateAccountButton();
    await pages.welcome().clickCreatePersonalAccountButton();
    expect(await pages.registration().isPasswordPolicyInfoVisible());

    await pages.registration().fillInUserInfo(userA);
    expect(await pages.registration().isSubmitButtonEnabled()).toBeFalsy();

    await pages.registration().toggleTermsCheckbox();
    expect(await pages.registration().isSubmitButtonEnabled()).toBeTruthy();

    await pages.registration().clickSubmitButton();
    const verificationCode = await api.brig.getActivationCodeForEmail(userA.email);
    expect(await pages.emailVerification().isEmailVerificationPageVisible()).toBeTruthy();
    await pages.emailVerification().enterVerificationCode(verificationCode);
    await modals.marketingConsent().clickConfirmButton();
  });

  await test.step('Personal user A sets user name', async () => {
    const {pages} = pageManager.webapp;
    await pages.setUsername().setUsername(userA.username);
    await pages.setUsername().clickNextButton();
    await pages.registerSuccess().clickOpenWireWebButton();
  });

  await test.step('Personal user A declines sending anonymous usage data', async () => {
    const {modals} = pageManager.webapp;
    await modals.dataShareConsent().isModalPresent();
    await modals.dataShareConsent().clickDecline();
  });

  await test.step('Personal user A checks that username was set correctly', async () => {
    const {pages, components} = pageManager.webapp;
    await expect(components.conversationSidebar().personalStatusName).toHaveText(
      `${userA.firstName} ${userA.lastName}`,
    );
    await expect(components.conversationSidebar().personalUserName).toContainText(userA.username);
    await expect(pages.conversation().watermark).toBeVisible();
  });

  await test.step('Personal user A searches for other personal user B', async () => {
    const {pages, modals, components} = pageManager.webapp;
    await components.conversationSidebar().clickConnectButton();
    await pages.startUI().selectUsers(userB.username);
    expect(await modals.userProfile().isVisible());
  });

  await test.step('Personal user A sends a connection request to personal user B', async () => {
    const {pages, modals} = pageManager.webapp;
    await modals.userProfile().clickConnectButton();
    await pages.conversationList().openConversation(userB.fullName);
    expect(await pages.outgoingConnection().getOutgoingConnectionUsername()).toContain(userB.username);
    expect(await pages.outgoingConnection().isPendingIconVisible(userB.fullName));
  });

  await test.step('Personal user B accepts request from A', async () => {
    await pageManagerB.webapp.pages.conversationList().openPendingConnectionRequest();
    await pageManagerB.webapp.pages.connectRequest().clickConnectButton();
    await pageManagerB.webapp.pages.conversationList().isConversationItemVisible(userA.fullName);
  });

  await test.step('Personal user A send message to personal user B', async () => {
    await sendTextMessageToUser(pageManager, userB, `Hello! ${userA.firstName} here.`);
  });

  await test.step('Personal user B can see the message from user A', async () => {
    await pageManagerB.webapp.pages.conversationList().openConversation(userA.fullName);
    await expect(
      pageManagerB.webapp.pages.conversation().getMessage({content: `Hello! ${userA.firstName} here.`}),
    ).toBeVisible();
  });

  await test.step('Personal user A blocks personal user B', async () => {
    const {pages, modals} = pageManager.webapp;
    await pages.conversationList().clickConversationOptions(userB.fullName);
    await pages.conversationList().clickBlockConversation();
    expect(await modals.blockWarning().isModalPresent());
    expect(await modals.blockWarning().getModalTitle()).toContain(`Block ${userB.fullName}`);
    expect(await modals.blockWarning().getModalText()).toContain(
      `${userB.fullName} won’t be able to contact you or add you to group conversations.`,
    );

    await modals.blockWarning().clickBlock();
    expect(await pages.conversationList().isConversationBlocked(userB.fullName));
  });

  await test.step('Personal user C sends a connection request to personal user A', async () => {
    await pageManagerC.webapp.components.conversationSidebar().clickConnectButton();
    await pageManagerC.webapp.pages.startUI().selectUsers(userA.username);
    await pageManagerC.webapp.modals.userProfile().clickConnectButton();
    await pageManagerC.webapp.pages.conversationList().openConversation(userA.fullName);
    expect(await pageManagerC.webapp.pages.outgoingConnection().getOutgoingConnectionUsername()).toContain(
      userA.username,
    );
    expect(await pageManagerC.webapp.pages.outgoingConnection().isPendingIconVisible(userA.fullName)).toBeTruthy();
  });

  await test.step('Personal user A accepts request from C', async () => {
    const {pages} = pageManager.webapp;
    await pages.conversationList().openPendingConnectionRequest();
    await pages.connectRequest().clickConnectButton();
  });

  await test.step('Personal user A send message to personal user C', async () => {
    await sendTextMessageToUser(pageManager, userC, `Hello! ${userA.firstName} here.`);
  });

  await test.step('Personal user C can see the message from user A', async () => {
    await pageManagerC.webapp.pages.conversationList().openConversation(userA.fullName);
    await expect(
      pageManagerC.webapp.pages.conversation().getMessage({content: `Hello! ${userA.firstName} here.`}),
    ).toBeVisible();
  });

  await test.step('Personal User A deletes their account', async () => {
    const {pages, modals, components} = pageManager.webapp;
    await components.conversationSidebar().clickPreferencesButton();
    await pages.account().clickDeleteAccountButton();
    expect(await modals.deleteAccount().isModalPresent()).toBeTruthy();
    expect(await modals.deleteAccount().getModalTitle()).toContain('Delete account');
    expect(await modals.deleteAccount().getModalText()).toContain(
      'We will send you an email. Follow the link to delete your account permanently.',
    );

    await modals.deleteAccount().clickDelete();
    const url = await api.inbucket.getAccountDeletionURL(userA.email);

    await pageManager.openNewTab(url, async tab => {
      await tab.webapp.pages.deleteAccount().clickDeleteAccountButton();
      expect(await tab.webapp.pages.deleteAccount().isAccountDeletedHeadlineVisible()).toBeTruthy();
    });
  });
});
