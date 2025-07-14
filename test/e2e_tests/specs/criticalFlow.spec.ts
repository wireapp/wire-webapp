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

import {Services} from '../data/serviceInfo';
import {getUser, User} from '../data/user';
import {PageManager} from '../pages/pageManager';
import {test, expect} from '../test.fixtures';
import {generateSecurePassword} from '../utils/userDataGenerator';

const createdUsers: User[] = [];
const createdTeams: Map<User, string> = new Map();

test('Team owner adds whole team to an all team chat', {tag: ['@TC-8631', '@crit-flow']}, async ({pages, api}) => {
  test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow
  // Generating test data
  const owner = getUser();
  const member1 = getUser();
  const member2 = getUser();
  const teamName = 'Critical';
  const conversationName = 'Crits';

  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createTeamOwner(owner, teamName);
    owner.teamId = await api.team.getTeamIdForUser(owner);
    createdTeams.set(owner, owner.teamId);
    const invitationIdForMember1 = await api.team.inviteUserToTeam(member1.email, owner);
    const invitationCodeForMember1 = await api.brig.getTeamInvitationCodeForEmail(owner.teamId, invitationIdForMember1);

    const invitationIdForMember2 = await api.team.inviteUserToTeam(member2.email, owner);
    const invitationCodeForMember2 = await api.brig.getTeamInvitationCodeForEmail(owner.teamId, invitationIdForMember2);

    await api.createPersonalUser(member1, invitationCodeForMember1);
    await api.createPersonalUser(member2, invitationCodeForMember2);
  });

  await test.step('Team owner logs in into a client and creates group conversation', async () => {
    await pages.openMainPage();
    await pages.singleSignOnPage.enterEmailOnSSOPage(owner.email);
    await pages.loginPage.inputPassword(owner.password);
    await pages.loginPage.clickSignInButton();
    await pages.dataShareConsentModal.clickDecline();
  });

  await test.step('Team owner adds a service to newly created group', async () => {
    await api.team.addServiceToTeamWhitelist(owner.teamId!, Services.POLL_SERVICE, owner.token!);
  });

  await test.step('Team owner adds team members to a group', async () => {
    await pages.conversationListPage.clickCreateGroup();
    await pages.groupCreationPage.setGroupName(conversationName);
    await pages.startUIPage.selectUsers([member1.username, member2.username]);
    await pages.groupCreationPage.clickCreateGroupButton();
    expect(await pages.conversationListPage.isConversationItemVisible(conversationName)).toBeTruthy();
  });

  // Steps below require [WPB-18075] and [WPB-17547]

  await test.step('All group participants send messages in a group', async () => {});

  await test.step('Team owner and group members react on received messages with reactions', async () => {});

  await test.step('All group participants make sure they see reactions from other group participants', async () => {});

  await test.step('Team owner removes one group member from a group', async () => {});

  await test.step('Team owner removes a service from a group', async () => {});
});

test('Account Management', {tag: ['@TC-8639', '@crit-flow']}, async ({pages, api}) => {
  test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

  // Generating test data
  const owner = getUser();
  const member = getUser();
  const teamName = 'Critical';
  const conversationName = 'Tracking';
  const appLockPassphrase = generateSecurePassword();

  // Creating preconditions for the test via API
  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createTeamOwner(owner, teamName);
    if (!owner.token) {
      throw new Error(`Owner ${owner.username} has no token and can't be used for team creation`);
    }
    const teamId = await api.team.getTeamIdForUser(owner);
    createdTeams.set(owner, teamId);
    const invitationId = await api.team.inviteUserToTeam(member.email, owner);
    const invitationCode = await api.brig.getTeamInvitationCodeForEmail(teamId, invitationId);

    await api.createPersonalUser(member, invitationCode);
    if (!member.id) {
      throw new Error(`Member ${member.username} has no ID and can't be invited to the conversation`);
    }
    await api.conversation.inviteToConversation(member.id, owner.token, teamId, conversationName);
  });

  // Test steps
  await test.step('Members logs in into the application', async () => {
    await pages.openMainPage();
    await pages.singleSignOnPage.enterEmailOnSSOPage(owner.email);
    await pages.loginPage.inputPassword(owner.password);
    await pages.loginPage.clickSignInButton();
    await pages.dataShareConsentModal.clickDecline();
  });

  await test.step('Member opens settings', async () => {
    await pages.conversationSidebar.clickPreferencesButton();
  });

  await test.step('Member enables logging in settings', async () => {
    await pages.accountPage.toggleSendUsageData();
  });

  await test.step('Member enables applock and sets their password', async () => {
    await pages.accountPage.toggleAppLock();
    await pages.appLockModal.setPasscode(appLockPassphrase);
    await pages.conversationSidebar.clickAllConversationsButton();
    expect(await pages.conversationListPage.isConversationItemVisible(conversationName));
  });

  await test.step('Member verifies if applock is working', async () => {
    await pages.refreshPage();
    expect(await pages.appLockModal.isVisible());
    expect(await pages.appLockModal.getAppLockModalHeader()).toContain('Enter passcode to unlock');
    expect(await pages.appLockModal.getAppLockModalText()).toContain('Passcode');

    await pages.appLockModal.unlockAppWithPasscode(appLockPassphrase);
    expect(await pages.appLockModal.isHidden());
    expect(await pages.conversationListPage.isConversationItemVisible(conversationName));
  });

  // TODO: Missing test steps for TC-8639 from testiny:
  // Member changes their email address to a new email address
  // Member resets their password
  //
  // These steps were not implemented in zautomation, so I skipped them here for the time being.
  await test.step('Member changes their email address to a new email address', async () => {});

  await test.step('Member resets their password ', async () => {});
});

test('Personal Account Lifecycle', {tag: ['@TC-8638', '@crit-flow']}, async ({pages, api}) => {
  test.setTimeout(150_000); // Increasing test timeout to 150 seconds to accommodate the full flow

  // Generating test data
  // userB is the contact user, userA is the user who registers
  const userB = getUser();
  const userA = getUser();

  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createPersonalUser(userB);
    createdUsers.push(userB);
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
    await pages.conversationPage.sendMessage('Hello there');
    expect(await pages.conversationPage.isMessageVisible('Hello there')).toBeTruthy();

    await api.sendMessageToPersonalConversation(userB, userA, 'Heya');
    expect(await pages.conversationPage.isMessageVisible('Heya')).toBeTruthy();
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

/**
 *
 * 1. Team owner logs in into a client and creates group conversation
 * 2. Team owner initiates audio call in a group
 * 3. During audio call all participants make sure they can mute and unmute audio and see non interruptions of a sound quality
 * 4. During audio call all participants start exchange with messages in a same group:
 * Send imagesCheck received imagesSend locationCheck location messages
 */
test(
  'Planning group call with sending various messages during call',
  {tag: ['@TC-8632', '@crit-flow']},
  async ({browser, api, pages: ownerPages}) => {
    test.setTimeout(150_000); // Increasing timeout to accommodate full flow

    const owner = getUser();
    const member = getUser();

    const teamName = 'Calling';
    const conversationName = 'Calling';

    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    const memberPages = new PageManager(memberPage);

    await test.step('Preconditions: Creating team and users via API', async () => {
      try {
        await api.createTeamOwner(owner, teamName);
        console.info(`Team owner created: ${owner.email}`);
        console.info('team owner', {owner});
        const teamId = await api.team.getTeamIdForUser(owner);
        owner.teamId = teamId;
        createdTeams.set(owner, owner.teamId);
        const invitationId = await api.team.inviteUserToTeam(member.email, owner);
        const invitationCode = await api.brig.getTeamInvitationCodeForEmail(owner.teamId, invitationId);
        await api.createPersonalUser(member, invitationCode);
        await api.enableConferenceCallingFeature(teamId);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for the feature to be enabled
      } catch (error) {
        console.error('Error during preconditions setup:', error.response);
        throw error;
      }
    });

    // await test.step('Preconditions: Upgrade team to enterprise', async () => {
    //   // create new context and go to https://wire-teams-staging.zinfra.io and upgrade team to enterprise
    //   const teamContext = await browser.newContext();
    //   const teamPage = await teamContext.newPage();
    //   await teamPage.goto('https://wire-teams-staging.zinfra.io', {
    //     waitUntil: 'networkidle',
    //   });

    //   // user name field data-uie-name="enter-login-identifier"
    //   await teamPage.fill('[data-uie-name="enter-login-identifier"]', owner.email);
    //   // password field data-uie-name="enter-login-password"
    //   await teamPage.fill('[data-uie-name="enter-login-password"]', owner.password);
    //   // submit button data-uie-name="do-login"
    //   await teamPage.click('[data-uie-name="do-login"]');

    //   // wait for the page to load
    //   await teamPage.waitForLoadState('networkidle');

    //   // click on consent button data-uie-name="self-user-details-confirm-changes"
    //   await teamPage.click('[data-uie-name="self-user-details-confirm-changes"]');

    //   // no market emails data-uie-name="do-decline-marketing-consent"
    //   await teamPage.click('[data-uie-name="do-decline-marketing-consent"]');

    //   // click on the billings tab data-uie-name="go-billing-page"
    //   await teamPage.click('[data-uie-name="go-billing-page"]');

    //   // wait for the page to load
    //   // await teamPage.waitForLoadState('networkidle');
    //   console.info('Waiting for the paid plan element to be visible');
    //   await teamPage.waitForSelector('[data-uie-name="element-paid-plan"]', {state: 'visible'});

    //   // click on the upgrade to enterprise button data-uie-name="do-open-upgrade-plan-flow"
    //   await teamPage.click('[data-uie-name="do-open-upgrade-plan-flow"]');

    //   // fill out the billing form
    //   // data-uie-name="billing-name-firstname-input"
    //   // data-uie-name="billing-name-lastname-input"
    //   // data-uie-name="billing-street-input"
    //   // data-uie-name="billing-postal-code-input"
    //   // data-uie-name="billing-city-input"
    //   // data-uie-name="billing-state-input"

    //   await teamPage.fill('[data-uie-name="billing-name-firstname-input"]', owner.firstName);
    //   await teamPage.fill('[data-uie-name="billing-name-lastname-input"]', owner.lastName);
    //   await teamPage.fill('[data-uie-name="billing-street-input"]', 'Test Street 123');
    //   await teamPage.fill('[data-uie-name="billing-postal-code-input"]', '12345');
    //   await teamPage.fill('[data-uie-name="billing-city-input"]', 'Test City');
    //   await teamPage.fill('[data-uie-name="billing-state-input"]', 'Test State');
    //   // go to next step
    //   await teamPage.click('[data-uie-name="billing-submit-button"]');

    //   await teamPage.waitForLoadState('networkidle');
    //   // wait for data-uie-name="element-paid-plan" to appear

    //   // data-uie-name="payment-method-card-holder-input"
    //   // fill in the card holder name
    //   await teamPage.fill('[data-uie-name="payment-method-card-holder-input"]', `${owner.firstName} ${owner.lastName}`);
    //   // input tag name="cardnumber"
    //   // these are in iframes each
    //   // const iframes = await teamPage.getByRole('iframe');
    //   // data-uie-name="payment-method-card-number-parent"

    //   // data-uie-name="modal-payment-method" all iframes are within this modal
    //   const iframes = teamPage.locator('[data-uie-name="modal-payment-method"] iframe');
    //   await iframes.nth(0).waitFor({state: 'attached'});
    //   await iframes.nth(1).waitFor({state: 'attached'});
    //   await iframes.nth(2).waitFor({state: 'attached'});

    //   const cardNumberFrame = iframes.nth(0).contentFrame();
    //   await cardNumberFrame.locator('input[name="cardnumber"]').fill('4242424242424242');

    //   const expDateFrame = iframes.nth(1).contentFrame();

    //   console.info('expDateFrame', {expDateFrame, iframes});
    //   // Check if the expDateFrame is accessible

    //   if (!expDateFrame) {
    //     throw new Error('expDate iframe not ready or inaccessible');
    //   }

    //   await expDateFrame.locator('input[name="exp-date"]').fill('05/30');

    //   const cvcFrame = iframes.nth(2).contentFrame();
    //   await cvcFrame.locator('input[name="cvc"]').fill('123');

    //   await teamPage.fill('[data-uie-name="payment-method-card-postal-code-input"]', '12345');
    //   // data-uie-name="payment-method-submit-button"
    //   await teamPage.click('[data-uie-name="payment-method-submit-button"]');

    //   await teamPage.waitForLoadState('networkidle');

    //   // data-uie-name="do-action"
    //   await teamPage.click('[data-uie-name="do-action"]');

    //   await teamPage.waitForLoadState('networkidle');

    //   // <span data-uie-name="status-modal-title" class="css-1cn9egm">Thank you!</span>

    //   expect(await teamPage.isVisible('[data-uie-name="status-modal-title"]')).toBeTruthy();

    //   // close the context
    //   await teamContext.close();
    //   console.info('Team upgraded to enterprise successfully');
    // });

    await test.step('Team owner logs in into a client and creates group conversation', async () => {
      await ownerPages.openMainPage();
      await ownerPages.singleSignOnPage.enterEmailOnSSOPage(owner.email);
      await ownerPages.loginPage.inputPassword(owner.password);
      await ownerPages.loginPage.clickSignInButton();
      await ownerPages.dataShareConsentModal.clickDecline();
    });

    await test.step('Team member logs in into a client', async () => {
      await memberPages.openMainPage();
      await memberPages.singleSignOnPage.enterEmailOnSSOPage(member.email);
      await memberPages.loginPage.inputPassword(member.password);
      await memberPages.loginPage.clickSignInButton();
      await memberPages.dataShareConsentModal.clickDecline();
    });

    await test.step('Team owner adds team member to the group', async () => {
      await ownerPages.conversationListPage.clickCreateGroup();
      await ownerPages.groupCreationPage.setGroupName(conversationName);
      await ownerPages.startUIPage.selectUsers([member.username]);
      await ownerPages.groupCreationPage.clickCreateGroupButton();
      expect(await ownerPages.conversationListPage.isConversationItemVisible(conversationName)).toBeTruthy();
    });

    await test.step('Team owner starts a call in the newly created group', async () => {
      await ownerPages.conversationListPage.openConversation(conversationName);
      await ownerPages.conversationPage.startCall();
      await ownerPages.callingPage.waitForCell();
      expect(await ownerPages.callingPage.isCellVisible()).toBeTruthy();
    });

    await test.step('Team member joins the call', async () => {
      await memberPages.conversationListPage.openConversation(conversationName);
      await memberPages.callingPage.waitForCell();
      expect(await memberPages.callingPage.isCellVisible()).toBeTruthy();

      // pick up the call
      await memberPages.callingPage.pickUpIncomingCall();
      expect(await memberPages.callingPage.isCellVisible()).toBeTruthy();
      expect(await memberPages.callingPage.isFullScreenVisible()).toBeFalsy();
    });

    await test.step('owner and member go full screen in the call', async () => {
      // go full screen on both sides
      await ownerPages.callingPage.maximizeCell();
      await memberPages.callingPage.maximizeCell();
      expect(await ownerPages.callingPage.isFullScreenVisible()).toBeTruthy();
      expect(await memberPages.callingPage.isFullScreenVisible()).toBeTruthy();
    });

    // check if team member can mute and unmute and team owner can see it
    await test.step('Team member mutes and unmutes audio', async () => {
      // owner sees member is muted
      expect(await ownerPages.callingPage.isGridTileMuteIconVisibleForUser(member.username)).toBeFalsy();

      // member unmutes themselves
      await memberPages.callingPage.unmuteSelfInFullScreen();
      expect(await memberPages.callingPage.isSelfUserMutedInFullScreen()).toBeFalsy();

      // owner waits for member to unmute
      await ownerPages.callingPage.waitForGridTileMuteIconToBeVisibleForUser(member.username);
      // owner sees member is unmuted
      expect(await ownerPages.callingPage.isGridTileMuteIconVisibleForUser(member.username)).toBeTruthy();
    });

    await test.step('Clean up: close extra member context', async () => {
      await memberContext.close();
    });
  },
);

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
