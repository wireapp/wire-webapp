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
import {PageManager} from 'test/e2e_tests/pages/pageManager';
import {addMockCamerasToContext} from 'test/e2e_tests/utils/mockVideoDeviceUtils';

import {test, expect} from '../../test.fixtures';
import {addCreatedTeam, addCreatedUser, tearDown} from '../../utils/tearDownUtil';

test('Group Video call', {tag: ['@TC-8637', '@crit-flow']}, async ({browser, pages: ownerPages, api}) => {
  test.setTimeout(150_000);

  // Add fake video devices to the browser context
  await addMockCamerasToContext(ownerPages.page.context());

  // Generate test data
  const teamName = 'Critical';
  const conversationName = 'CritiCall';
  const teamOwner = getUser();

  const teamMember = getUser();
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  const memberPages = new PageManager(memberPage);

  let callingServiceInstanceId: string;

  const guestUser = getUser();
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  const guestPages = new PageManager(guestPage);

  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createTeamOwner(teamOwner, teamName);
    addCreatedTeam(teamOwner, teamOwner.teamId!);
    await api.enableConferenceCallingFeature(teamOwner.teamId!);

    const invitationIdForMember = await api.team.inviteUserToTeam(teamMember.email, teamOwner);
    const invitationCodeForMember = await api.brig.getTeamInvitationCodeForEmail(
      teamOwner.teamId!,
      invitationIdForMember,
    );

    await api.createPersonalUser(teamMember, invitationCodeForMember);

    await api.createPersonalUser(guestUser);
    addCreatedUser(guestUser);
  });

  await test.step('Users A, B, and C are logged in', async () => {
    await Promise.all([
      (async () => {
        await ownerPages.openMainPage();
        await ownerPages.singleSignOnPage.enterEmailOnSSOPage(teamOwner.email);
        await ownerPages.loginPage.inputPassword(teamOwner.password);
        await ownerPages.loginPage.clickSignInButton();
        await ownerPages.dataShareConsentModal.clickDecline();
      })(),

      (async () => {
        await memberPages.openMainPage();
        await memberPages.singleSignOnPage.enterEmailOnSSOPage(teamMember.email);
        await memberPages.loginPage.inputPassword(teamMember.password);
        await memberPages.loginPage.clickSignInButton();
        await memberPages.dataShareConsentModal.clickDecline();
      })(),

      (async () => {
        await guestPages.openMainPage();
        await guestPages.singleSignOnPage.enterEmailOnSSOPage(guestUser.email);
        await guestPages.loginPage.inputPassword(guestUser.password);
        await guestPages.loginPage.clickSignInButton();
        await guestPages.dataShareConsentModal.clickDecline();
      })(),
    ]);
  });

  await test.step('Users A and B are in a group conversation together', async () => {
    await ownerPages.conversationListPage.clickCreateGroup();
    await ownerPages.groupCreationPage.setGroupName(conversationName);
    await ownerPages.startUIPage.selectUser(teamMember.username);
    await ownerPages.groupCreationPage.clickCreateGroupButton();
    expect(await ownerPages.conversationListPage.isConversationItemVisible(conversationName)).toBeTruthy();
  });

  await test.step('User A connects with User C', async () => {
    await ownerPages.conversationSidebar.clickConnectButton();
    await ownerPages.startUIPage.searchInput.fill(guestUser.username);
    await ownerPages.startUIPage.selectUser(guestUser.username);
    await ownerPages.userProfileModal.clickConnectButton();

    // // "Name not available" is visible instead
    expect(await ownerPages.conversationListPage.isConversationItemVisible(guestUser.fullName));
    await expect(guestPages.page).toHaveTitle('(1) Wire');

    await guestPages.conversationListPage.openPendingConnectionRequest();
    await guestPages.connectRequestPage.clickConnectButton();
    expect(await guestPages.conversationListPage.isConversationItemVisible(teamOwner.fullName));
  });

  await test.step('User A invites User C to the group', async () => {
    await ownerPages.conversationListPage.openConversation(conversationName);
    await ownerPages.conversationPage.clickConversationTitle();
    await ownerPages.conversationDetailsPage.clickAddParticipantsButton();
    await ownerPages.addParticipantsPage.selectUser(guestUser.username);
    await ownerPages.addParticipantsPage.clickAddButton();
    expect(await ownerPages.conversationDetailsPage.memberListContainsUser(guestUser.username)).toBeTruthy();
    expect(await ownerPages.conversationDetailsPage.memberListContainsUser(teamMember.username)).toBeTruthy();
  });

  await test.step('User C joins the group', async () => {
    expect(await guestPages.conversationListPage.isConversationItemVisible(conversationName)).toBeTruthy();
  });

  await test.step('User A calls the group', async () => {
    const response = await api.callingService.createInstance(teamMember.password, teamMember.email);
    callingServiceInstanceId = response.id;
    await api.callingService.setAcceptNextCall(callingServiceInstanceId);

    await ownerPages.conversationPage.clickConversationInfoButton();
    await ownerPages.conversationPage.clickCallButton();
  });

  await test.step('User B and User C answer call from calling notification', async () => {
    // User B answers the call automatically with the help of Calling Service
    await guestPages.callingPage.clickAcceptCallButton();
  });

  await test.step('User A switches audio on and sends audio', async () => {});

  await test.step('User B is able to “hear” User A’s audio', async () => {
    await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
  });

  await test.step('User A turns on camera', async () => {
    await ownerPages.callingPage.clickToggleVideoButton();
  });

  await test.step('User B is able to “see” User A', async () => {
    await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
  });

  await test.step('User A swaps video and audio devices', async () => {
    await ownerPages.conversationSidebar.clickPreferencesButton();
    await ownerPages.settingsPage.clickAudioVideoSettingsButton();
    await ownerPages.audioVideoSettingsPage.selectMicrophone('Fake Audio Input 2');
    await ownerPages.audioVideoSettingsPage.selectSpeaker('Fake Audio Output 2');
    await ownerPages.audioVideoSettingsPage.selectCamera('Fake Camera 2');
  });

  await test.step('User B is able to "see" and "hear" User A’s new audio and video', async () => {
    await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
    await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
  });

  await test.step('User A turns on screenshare', async () => {
    await ownerPages.callingPage.clickToggleScreenShareButton();
  });

  await test.step('User B is able to “see” User A’s screen', async () => {
    await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
  });

  await test.step('User A ends call', async () => {
    await ownerPages.callingPage.clickLeaveCallButton();
  });
});

test.afterAll(async ({api}) => {
  await tearDown(api);
});
