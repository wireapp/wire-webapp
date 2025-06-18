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

import {faker} from '@faker-js/faker';

import {getUser, User} from './data/user';
import {AccountPage} from './pages/account.page';
import {AppLockModal} from './pages/appLock.modal';
import {BlockWarningModal} from './pages/blockWarning.modal';
import {ConversationPage} from './pages/conversation.page';
import {ConversationListPage} from './pages/conversationList.page';
import {ConversationSidebar} from './pages/conversationSidebar.page';
import {DataShareConsentModal} from './pages/dataShareConsent.modal';
import {DeleteAccountModal} from './pages/deleteAccount.modal';
import {DeleteAccountPage} from './pages/deleteAccount.page';
import {EmailVerificationPage} from './pages/emailVerification.page';
import {LoginPage} from './pages/login.page';
import {MarketingConsentModal} from './pages/marketingConsent.modal';
import {OutgoingConnectionPage} from './pages/outgoingConnection.page';
import {RegistrationPage} from './pages/registration.page';
import {SetUsernamePage} from './pages/setUsername.page';
import {SingleSignOnPage} from './pages/singleSignOn.page';
import {StartUIPage} from './pages/startUI.page';
import {UserProfileModal} from './pages/userProfile.modal';
import {WelcomePage} from './pages/welcome.page';
import {test, expect} from './test.fixtures';
import {generateSecurePassword} from './utils/userDataGenerator';

const webAppPath = process.env.WEBAPP_URL ?? '';
const createdUsers: User[] = [];
const createdTeams: Map<User, string> = new Map();

test('Account Management', {tag: ['@TC-8639', '@crit-flow']}, async ({page, api}) => {
  test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

  // Generating test data
  const owner = getUser();
  const member = getUser();
  const teamName = 'Critical';
  const conversationName = 'Tracking';
  const appLockPassphrase = generateSecurePassword();

  // Initializing page objects
  const singleSignOnPage = new SingleSignOnPage(page);
  const loginPage = new LoginPage(page);
  const dataShareConsentModal = new DataShareConsentModal(page);
  const conversationSidebar = new ConversationSidebar(page);
  const accountPage = new AccountPage(page);
  const appLockModal = new AppLockModal(page);
  const conversationListPage = new ConversationListPage(page);

  // Creating preconditions for the test via API
  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createTeamOwner(owner, teamName);
    if (!owner.token) {
      throw new Error(`Owner ${owner.username} has no token and can't be used for team creation`);
    }
    const teamId = await api.team.getTeamIdForUser(owner);
    createdTeams.set(owner, teamId);
    const invitationId = await api.team.inviteUserToTeam(
      teamId,
      member.email,
      `${owner.firstName} ${owner.lastName}`,
      owner.token,
    );
    const invitationCode = await api.brig.getTeamInvitationCodeForEmail(teamId, invitationId);

    await api.createPersonalUser(member, invitationCode);
    if (!member.id) {
      throw new Error(`Member ${member.username} has no ID and can't be invited to the conversation`);
    }
    await api.conversation.inviteToConversation(member.id, owner.token, teamId, conversationName);
  });

  // Test steps
  await test.step('Members logs in into the application', async () => {
    await page.goto(webAppPath);
    await singleSignOnPage.enterEmailOnSSOPage(owner.email);
    await loginPage.inputPassword(owner.password);
    await loginPage.clickSignInButton();
    await dataShareConsentModal.clickDecline();
  });

  // TODO:
  // zautomation also features the following steps:
  //
  //     When I remember number of reported events
  //     And User <Owner> pinged in the conversation with Tracking
  //     Then There are no added reported events
  //
  // but these are not a part of the original test case, so I skip them here.

  await test.step('Member opens settings', async () => {
    await conversationSidebar.clickPreferencesButton();
  });

  await test.step('Member enables logging in settings', async () => {
    await accountPage.toggleSendUsageData();
  });

  await test.step('Member enables applock and sets their password', async () => {
    await accountPage.toggleAppLock();
    await appLockModal.setPasscode(appLockPassphrase);
    await conversationSidebar.clickAllConversationsButton();
    expect(await conversationListPage.isConversationItemVisible(conversationName));
  });

  await test.step('Member verifies if applock is working', async () => {
    await page.reload();
    expect(await appLockModal.isVisible());
    expect(await conversationListPage.isConversationItemVisible(conversationName)).toBeFalsy();
    expect(await appLockModal.getAppLockModalHeader()).toContain('Enter passcode to unlock');
    expect(await appLockModal.getAppLockModalText()).toContain('Passcode');

    await appLockModal.unlockAppWithPasscode(appLockPassphrase);
    expect(await appLockModal.isHidden());
    expect(await conversationListPage.isConversationItemVisible(conversationName));
  });

  // TODO: Missing test steps for TC-8639 from testiny:
  // Member changes their email address to a new email address
  // Member resets their password
  //
  // These steps were not implemented in zautomation, so I skipped them here for the time being.
  await test.step('Member changes their email address to a new email address', async () => {});

  await test.step('Member resets their password ', async () => {});
});

test('Personal Account Lifecycle', {tag: ['@TC-8638', '@crit-flow']}, async ({page, api}) => {
  test.setTimeout(120_000); // Increasing test timeout to 120 seconds to accommodate the full flow

  // Generating test data
  // userB is the contact user, userA is the user who registers
  const userB = getUser();
  const userA = getUser();

  // Initializing page objects
  const singleSignOnPage = new SingleSignOnPage(page);
  const welcomePage = new WelcomePage(page);
  const registrationPage = new RegistrationPage(page);
  const verificationPage = new EmailVerificationPage(page);
  const marketingConsentModal = new MarketingConsentModal(page);
  const setUsernamePage = new SetUsernamePage(page);
  const dataShareConsentModal = new DataShareConsentModal(page);
  const conversationSidebar = new ConversationSidebar(page);
  const conversationPage = new ConversationPage(page);
  const startUIPage = new StartUIPage(page);
  const userProfileModal = new UserProfileModal(page);
  const conversationListPage = new ConversationListPage(page);
  const outgoingConnectionPage = new OutgoingConnectionPage(page);
  const blockWarningModal = new BlockWarningModal(page);
  const deleteAccountModal = new DeleteAccountModal(page);
  const accountPage = new AccountPage(page);

  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createPersonalUser(userB);
    createdUsers.push(userB);
    // Disabled until [WPB-18255] is done
    // await api.addDevicesToUser(userB, 1);
  });

  // Test steps
  await test.step('User A opens the application and registers personal account', async () => {
    await page.goto(webAppPath);
    await singleSignOnPage.enterEmailOnSSOPage(userA.email);
    await welcomePage.clickCreateAccountButton();
    await welcomePage.clickCreatePersonalAccountButton();
    expect(await registrationPage.isPasswordPolicyInfoVisible());

    await registrationPage.fillInUserInfo(userA);
    expect(await registrationPage.isSubmitButtonEnabled()).toBeFalsy();

    await registrationPage.toggleTermsCheckbox();
    expect(await registrationPage.isSubmitButtonEnabled()).toBeTruthy();

    await registrationPage.clickSubmitButton();
    const verificationCode = await api.inbucket.getVerificationCode(userA.email);
    await verificationPage.enterVerificationCode(verificationCode);
    await marketingConsentModal.clickConfirmButton();
  });

  await test.step('Personal user A sets user name', async () => {
    // Expect that automatic username generation is correct
    expect(await setUsernamePage.getHandleInputValue()).toBe(userA.username);
    const newUsername = userA.username.slice(0, 10) + faker.string.alpha(5).toLowerCase();
    userA.username = newUsername;
    await setUsernamePage.setUsername(newUsername);
    await setUsernamePage.clickNextButton();
  });

  await test.step('Personal user A declines sending anonymous usage data', async () => {
    await dataShareConsentModal.isModalPresent();
    await dataShareConsentModal.clickDecline();
  });

  await test.step('Personal user A checks that username was set correctly', async () => {
    expect(await conversationSidebar.getPersonalStatusName()).toBe(`${userA.firstName} ${userA.lastName}`);
    expect(await conversationSidebar.getPersonalUserName()).toContain(userA.username);
    expect(await conversationPage.isWatermarkVisible());
  });

  await test.step('Personal user A searches for other personal user B', async () => {
    await conversationSidebar.clickConnectButton();
    await startUIPage.searchForUser(userB.username);
    await startUIPage.clickUserFromSearchResults(userB.username);
    expect(await userProfileModal.isVisible());
  });

  await test.step('Personal user A sends a connection request to personal user B', async () => {
    await userProfileModal.clickConnectButton();
    await conversationListPage.openConversation(userB.fullName);
    expect(await outgoingConnectionPage.getOutgoingConnectionUsername()).toContain(userB.username);
    expect(await outgoingConnectionPage.isPendingIconVisible(userB.fullName));
  });

  await test.step('Personal user B accepts request', async () => {
    await api.acceptConnectionRequest(userB);
    expect(await outgoingConnectionPage.isPendingIconHidden(userB.fullName));
  });

  await test.step('Personal user A and personal user B exchange some messages', async () => {
    // TODO: Conversation sometimes closes after connection request was approved, so we need to reopen it
    await conversationListPage.openConversation(userB.fullName);
    expect(await conversationPage.isConversationOpen(userB.fullName));

    await conversationPage.sendMessage('Hello there');
    expect(await conversationPage.isMessageVisible('Hello there')).toBeTruthy();

    // Disabled until [WPB-18255] is done
    // await api.sendMessageToPersonalConversation(userB, userA, 'Heya');
    // expect(await conversationPage.isMessageVisible('Heya')).toBeTruthy();
  });

  await test.step('Personal user A blocks personal user B', async () => {
    await conversationListPage.clickConversationOptions(userB.fullName);
    await conversationListPage.clickBlockConversation();
    expect(await blockWarningModal.isModalPresent());
    expect(await blockWarningModal.getModalTitle()).toContain(`Block ${userB.fullName}`);
    expect(await blockWarningModal.getModalText()).toContain(
      `${userB.fullName} won’t be able to contact you or add you to group conversations.`,
    );

    await blockWarningModal.clickBlock();
    expect(await conversationListPage.isConversationBlocked(userB.fullName));

    // [WPB-18093] Backend not returning the blocked 1:1 in conversations list
    // When User <Contact> sends message "See this?" to personal MLS conversation <Name>
    // Then I do not see text message See this?
  });

  await test.step('Personal user A opens settings', async () => {
    await conversationSidebar.clickPreferencesButton();
  });

  await test.step('Personal User A deletes their account', async () => {
    await accountPage.clickDeleteAccountButton();
    expect(await deleteAccountModal.isModalPresent());
    expect(await deleteAccountModal.getModalTitle()).toContain('Delete account');
    expect(await deleteAccountModal.getModalText()).toContain(
      'We will send you an email. Follow the link to delete your account permanently.',
    );

    await deleteAccountModal.clickDelete();
    const url = await api.inbucket.getAccountDeletionURL(userA.email);

    const newTab = await page.context().newPage();
    await newTab.goto(url);
    const deleteAccountPage = new DeleteAccountPage(newTab);
    await deleteAccountPage.clickDeleteAccountButton();
    expect(await deleteAccountPage.isAccountDeletedHeadlineVisible());

    await newTab.close();
    expect(await welcomePage.getLogoutReasonText()).toContain('You were signed out because your account was deleted');
  });
});

test.afterAll(async ({api}) => {
  for (const [user, teamId] of createdTeams.entries()) {
    await api.team.deleteTeam(user, teamId);
  }

  for (const user of createdUsers) {
    const token = user.token ?? (await api.auth.loginUser(user)).data.access_token;
    if (!token) {
      throw new Error(`Couldn't fetch token for ${user.username} and therefore can't delete the user`);
    }
    await api.user.deleteUser(user.password, token);
  }
});
