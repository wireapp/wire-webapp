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
import {addCreatedUser, removeCreatedUser} from '../../utils/tearDownUtil';

// Generating test data
// userB is the contact user, userA is the user who registers
const userB = getUser();
const userA = getUser();

test('Personal Account Lifecycle', {tag: ['@TC-8638', '@crit-flow-web']}, async ({pageManager, api}) => {
  test.slow();
  const {pages, modals, components} = pageManager.webapp;

  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createPersonalUser(userB);
    addCreatedUser(userB);
  });

  // Test steps
  await test.step('User A opens the application and registers personal account', async () => {
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
    const verificationCode = await api.inbucket.getVerificationCode(userA.email);
    await pageManager.tm.pages.emailVerification().enterVerificationCode(verificationCode);
    await pageManager.tm.modals.marketingConsent().clickConfirmButton();
  });

  await test.step('Personal user A sets user name', async () => {
    await pageManager.tm.pages.setUsername().setUsername(userA.username);
    await pageManager.tm.pages.setUsername().clickNextButton();
    await pageManager.tm.pages.registerSuccess().clickOpenWireWebButton();
  });

  await test.step('Personal user A declines sending anonymous usage data', async () => {
    await modals.dataShareConsent().isModalPresent();
    await modals.dataShareConsent().clickDecline();
  });

  await test.step('Personal user A checks that username was set correctly', async () => {
    expect(await components.conversationSidebar().getPersonalStatusName()).toBe(`${userA.firstName} ${userA.lastName}`);
    expect(await components.conversationSidebar().getPersonalUserName()).toContain(userA.username);
    expect(await pages.conversation().isWatermarkVisible());
  });

  await test.step('Personal user A searches for other personal user B', async () => {
    await components.conversationSidebar().clickConnectButton();
    await pages.startUI().selectUser(userB.username);
    expect(await modals.userProfile().isVisible());
  });

  await test.step('Personal user A sends a connection request to personal user B', async () => {
    await modals.userProfile().clickConnectButton();
    await pages.conversationList().openConversation(userB.fullName);
    expect(await pages.outgoingConnection().getOutgoingConnectionUsername()).toContain(userB.username);
    expect(await pages.outgoingConnection().isPendingIconVisible(userB.fullName));
  });

  await test.step('Personal user B accepts request', async () => {
    await api.acceptConnectionRequest(userB);
    expect(await pages.outgoingConnection().isPendingIconHidden(userB.fullName));
  });

  await test.step('Personal user A and personal user B exchange some messages', async () => {
    // TODO: Conversation sometimes closes after connection request was approved, so we need to reopen it
    await pages.conversationList().openConversation(userB.fullName);
    expect(await pages.conversation().isConversationOpen(userB.fullName));

    // TODO: Bug [WPB-18226] Message is not visible in the conversation after sending it
    // await pages.conversationPage.sendMessage('Hello there');
    // expect(await pages.conversationPage.isMessageVisible('Hello there')).toBeTruthy();

    // await api.sendMessageToPersonalConversation(userB, userA, 'Heya');
    // expect(await pages.conversationPage.isMessageVisible('Heya')).toBeTruthy();
  });

  await test.step('Personal user A blocks personal user B', async () => {
    await pages.conversationList().clickConversationOptions(userB.fullName);
    await pages.conversationList().clickBlockConversation();
    expect(await modals.blockWarning().isModalPresent());
    expect(await modals.blockWarning().getModalTitle()).toContain(`Block ${userB.fullName}`);
    expect(await modals.blockWarning().getModalText()).toContain(
      `${userB.fullName} won’t be able to contact you or add you to group conversations.`,
    );

    await modals.blockWarning().clickBlock();
    expect(await pages.conversationList().isConversationBlocked(userB.fullName));

    // [WPB-18093] Backend not returning the blocked 1:1 in conversations list
    // When User <Contact> sends message "See this?" to personal MLS conversation <Name>
    // Then I do not see text message See this?
  });

  await test.step('Personal user A opens settings', async () => {
    await components.conversationSidebar().clickPreferencesButton();
  });

  // Uncomment when [WPB-18496] is fixed
  // await test.step('Personal User A deletes their account', async () => {
  //   await pages.accountPage.clickDeleteAccountButton();
  //   expect(await pages.deleteAccountModal.isModalPresent());
  //   expect(await pages.deleteAccountModal.getModalTitle()).toContain('Delete account');
  //   expect(await pages.deleteAccountModal.getModalText()).toContain(
  //     'We will send you an email. Follow the link to delete your account permanently.',
  //   );

  //   await pages.deleteAccountModal.clickDelete();
  //   const url = await api.inbucket.getAccountDeletionURL(userA.email);

  //   await pages.openNewTab(url, async tab => {
  //     await tab.deleteAccountPage.clickDeleteAccountButton();
  //     expect(await tab.deleteAccountPage.isAccountDeletedHeadlineVisible());
  //   });

  //   expect(await pages.welcomePage.getLogoutReasonText()).toContain(
  //     'You were signed out because your account was deleted',
  //   );
  // });
});

test.afterAll(async ({api}) => {
  await removeCreatedUser(api, userB);
});
