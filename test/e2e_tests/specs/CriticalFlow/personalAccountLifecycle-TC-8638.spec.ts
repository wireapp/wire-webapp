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
import {loginUser, sendTextMessageToUser} from 'test/e2e_tests/utils/userActions';

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';
import {addCreatedUser, removeCreatedUser} from '../../utils/tearDownUtil';

// Generating test data
// otherUsers[0] is the contact user, userA is the user who registers
const userA = getUser();
const otherUsers = Array.from({length: 2}, () => getUser());

test('Personal Account Lifecycle', {tag: ['@TC-8638', '@crit-flow-web']}, async ({pageManager, api, browser}) => {
  const pageManagers = await Promise.all(
    otherUsers.map(async user => {
      const memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();
      return new PageManager(memberPage);
    }),
  );

  const {pages, modals, components} = pageManager.webapp;
  test.setTimeout(120_000); // Increasing test timeout to 120 seconds to accommodate the full flow

  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await Promise.all(
      otherUsers.map(async (user, index) => {
        await api.createPersonalUser(user);
        addCreatedUser(user);
        await pageManagers[index].openMainPage();
        await loginUser(user, pageManagers[index]);
        await pageManagers[index].webapp.modals.dataShareConsent().clickDecline();
      }),
    );
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
    const verificationCode = await api.brig.getActivationCodeForEmail(userA.email);
    expect(await pages.emailVerification().isEmailVerificationPageVisible()).toBeTruthy();
    await pages.emailVerification().enterVerificationCode(verificationCode);
    await modals.marketingConsent().clickConfirmButton();
  });

  await test.step('Personal user A sets user name', async () => {
    await pages.setUsername().setUsername(userA.username);
    await pages.setUsername().clickNextButton();
    await pages.registerSuccess().clickOpenWireWebButton();
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
    await pages.startUI().selectUser(otherUsers[0].username);
    expect(await modals.userProfile().isVisible());
  });

  await test.step('Personal user A sends a connection request to personal user B', async () => {
    await modals.userProfile().clickConnectButton();
    await pages.conversationList().openConversation(otherUsers[0].fullName);
    expect(await pages.outgoingConnection().getOutgoingConnectionUsername()).toContain(otherUsers[0].username);
    expect(await pages.outgoingConnection().isPendingIconVisible(otherUsers[0].fullName));
  });

  await test.step('Personal user B accepts request from A', async () => {
    await pageManagers[0].webapp.pages.conversationList().openPendingConnectionRequest();
    await pageManagers[0].webapp.pages.connectRequest().clickConnectButton();
    await pageManager.waitForTimeout(5000); // Wait for the connection to be established
  });

  // await test.step('Personal user A and personal user B exchange some messages', async () => {
  //   await pages.conversationList().openConversation(otherUsers[0].fullName);
  //   expect(await pages.conversation().isConversationOpen(otherUsers[0].fullName));

  //   // TODO: Bug [WPB-18226] Message is not visible in the conversation after sending it
  //   // await pages.conversationPage.sendMessage('Hello there');
  //   // expect(await pages.conversationPage.isMessageVisible('Hello there')).toBeTruthy();

  //   // await api.sendMessageToPersonalConversation(otherUsers[0], userA, 'Heya');
  //   // expect(await pages.conversationPage.isMessageVisible('Heya')).toBeTruthy();
  // });

  await test.step('Personal user A send message to personal user B', async () => {
    await sendTextMessageToUser(pageManager, otherUsers[0], `Hello team! ${userA.firstName} here.`);
  });

  await test.step('Personal user B can see the message from user A', async () => {
    await pageManagers[0].webapp.pages.conversationList().openConversation(userA.fullName);
    expect(
      await pageManagers[0].webapp.pages.conversation().isMessageVisible(`Hello team! ${userA.firstName} here.`),
    ).toBeTruthy();
  });

  await test.step('Personal user A blocks personal user B', async () => {
    await pages.conversationList().clickConversationOptions(otherUsers[0].fullName);
    await pages.conversationList().clickBlockConversation();
    expect(await modals.blockWarning().isModalPresent());
    expect(await modals.blockWarning().getModalTitle()).toContain(`Block ${otherUsers[0].fullName}`);
    expect(await modals.blockWarning().getModalText()).toContain(
      `${otherUsers[0].fullName} won’t be able to contact you or add you to group conversations.`,
    );

    await modals.blockWarning().clickBlock();
    expect(await pages.conversationList().isConversationBlocked(otherUsers[0].fullName));

    // [WPB-18093] Backend not returning the blocked 1:1 in conversations list
    // When User <Contact> sends message "See this?" to personal MLS conversation <Name>
    // Then I do not see text message See this?
  });

  await test.step('Personal user C sends a connection request to personal user A', async () => {
    await pageManagers[1].webapp.components.conversationSidebar().clickConnectButton();
    await pageManagers[1].webapp.pages.startUI().selectUser(userA.username);
    expect(await pageManagers[1].webapp.modals.userProfile().isVisible());
    await pageManagers[1].webapp.modals.userProfile().clickConnectButton();
    await pageManagers[1].webapp.pages.conversationList().openConversation(userA.fullName);
    expect(await pageManagers[1].webapp.pages.outgoingConnection().getOutgoingConnectionUsername()).toContain(
      userA.username,
    );
    expect(await pageManagers[1].webapp.pages.outgoingConnection().isPendingIconVisible(userA.fullName));
  });

  await test.step('Personal user A accepts request from C', async () => {
    await pages.conversationList().openPendingConnectionRequest();
    await pages.connectRequest().clickConnectButton();
    await pageManager.waitForTimeout(5000); // Wait for the connection to be established
  });

  await test.step('Personal user A send message to personal user C', async () => {
    await sendTextMessageToUser(pageManager, otherUsers[1], `Hello team! ${userA.firstName} here.`);
  });

  await test.step('Personal user C can see the message from user A', async () => {
    await pageManagers[1].refreshPage({waitUntil: 'networkidle'});
    await pageManagers[1].webapp.pages.conversationList().openConversation(userA.fullName);
    expect(
      await pageManagers[1].webapp.pages.conversation().isMessageVisible(`Hello team! ${userA.firstName} here.`),
    ).toBeTruthy();
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
  await removeCreatedUser(api, otherUsers[0]);
});
