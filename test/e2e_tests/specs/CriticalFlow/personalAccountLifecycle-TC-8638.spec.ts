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

test('Personal Account Lifecycle', {tag: ['@TC-8638', '@crit-flow-web']}, async ({pages, api}) => {
  test.setTimeout(150_000); // Increasing test timeout to 150 seconds to accommodate the full flow

  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createPersonalUser(userB);
    addCreatedUser(userB);
    await api.addDevicesToUser(userB, 1);
  });

  // Test steps
  await test.step('User A opens the application and registers personal account', async () => {
    await pages.openMainPage();
    await pages.singleSignOnPage.enterEmailOnSSOPage(userA.email);
    await pages.welcomePage.clickCreateAccountButton();
    await pages.welcomePage.clickCreatePersonalAccountButton();
    expect(await pages.registrationPage.isPasswordPolicyInfoVisible());

    await pages.registrationPage.fillInUserInfo(userA);
    expect(await pages.registrationPage.isSubmitButtonEnabled()).toBeFalsy();

    await pages.registrationPage.toggleTermsCheckbox();
    expect(await pages.registrationPage.isSubmitButtonEnabled()).toBeTruthy();

    await pages.registrationPage.clickSubmitButton();
    const verificationCode = await api.inbucket.getVerificationCode(userA.email);
    await pages.verificationPage.enterVerificationCode(verificationCode);
    await pages.marketingConsentModal.clickConfirmButton();
  });

  await test.step('Personal user A sets user name', async () => {
    await pages.setUsernamePage.setUsername(userA.username);
    await pages.setUsernamePage.clickNextButton();
    await pages.registerSuccessPage.clickOpenWireWebButton();
  });

  await test.step('Personal user A declines sending anonymous usage data', async () => {
    await pages.dataShareConsentModal.isModalPresent();
    await pages.dataShareConsentModal.clickDecline();
  });

  await test.step('Personal user A checks that username was set correctly', async () => {
    expect(await pages.conversationSidebar.getPersonalStatusName()).toBe(`${userA.firstName} ${userA.lastName}`);
    expect(await pages.conversationSidebar.getPersonalUserName()).toContain(userA.username);
    expect(await pages.conversationPage.isWatermarkVisible());
  });

  await test.step('Personal user A searches for other personal user B', async () => {
    await pages.conversationSidebar.clickConnectButton();
    await pages.startUIPage.selectUser(userB.username);
    expect(await pages.userProfileModal.isVisible());
  });

  await test.step('Personal user A sends a connection request to personal user B', async () => {
    await pages.userProfileModal.clickConnectButton();
    await pages.conversationListPage.openConversation(userB.fullName);
    expect(await pages.outgoingConnectionPage.getOutgoingConnectionUsername()).toContain(userB.username);
    expect(await pages.outgoingConnectionPage.isPendingIconVisible(userB.fullName));
  });

  await test.step('Personal user B accepts request', async () => {
    await api.acceptConnectionRequest(userB);
    expect(await pages.outgoingConnectionPage.isPendingIconHidden(userB.fullName));
  });

  await test.step('Personal user A and personal user B exchange some messages', async () => {
    // TODO: Conversation sometimes closes after connection request was approved, so we need to reopen it
    await pages.conversationListPage.openConversation(userB.fullName);
    expect(await pages.conversationPage.isConversationOpen(userB.fullName));

    // TODO: Bug [WPB-18226] Message is not visible in the conversation after sending it
    // await pages.conversationPage.sendMessage('Hello there');
    // expect(await pages.conversationPage.isMessageVisible('Hello there')).toBeTruthy();

    // await api.sendMessageToPersonalConversation(userB, userA, 'Heya');
    // expect(await pages.conversationPage.isMessageVisible('Heya')).toBeTruthy();
  });

  await test.step('Personal user A blocks personal user B', async () => {
    await pages.conversationListPage.clickConversationOptions(userB.fullName);
    await pages.conversationListPage.clickBlockConversation();
    expect(await pages.blockWarningModal.isModalPresent());
    expect(await pages.blockWarningModal.getModalTitle()).toContain(`Block ${userB.fullName}`);
    expect(await pages.blockWarningModal.getModalText()).toContain(
      `${userB.fullName} won’t be able to contact you or add you to group conversations.`,
    );

    await pages.blockWarningModal.clickBlock();
    expect(await pages.conversationListPage.isConversationBlocked(userB.fullName));

    // [WPB-18093] Backend not returning the blocked 1:1 in conversations list
    // When User <Contact> sends message "See this?" to personal MLS conversation <Name>
    // Then I do not see text message See this?
  });

  await test.step('Personal user A opens settings', async () => {
    await pages.conversationSidebar.clickPreferencesButton();
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
