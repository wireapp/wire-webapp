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
import {addMockCamerasToContext} from 'test/e2e_tests/utils/mockVideoDevice.util';
import {addCreatedTeam, addCreatedUser, removeCreatedTeam, removeCreatedUser} from 'test/e2e_tests/utils/tearDown.util';
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {test, expect} from '../../test.fixtures';

// Generate test data
const teamName = 'Critical';
const conversationName = 'CritiCall';
let teamOwner = getUser();
teamOwner.firstName = 'integrationtest';
teamOwner.lastName = 'integrationtest';
teamOwner.fullName = 'integrationtest';

const teamMember = getUser();
const guestUser = getUser();

test(
  'Group Video call',
  {tag: ['@TC-8637', '@crit-flow-web']},
  async ({browser, pageManager: ownerPageManager, api}) => {
    test.setTimeout(150_000);

    const {pages: ownerPages, modals: ownerModals, components: ownerComponents} = ownerPageManager.webapp;

    // Add fake video devices to the browser context
    await addMockCamerasToContext(ownerPageManager.getContext());

    // Generate test data
    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    const memberPageManager = PageManager.from(memberPage);
    const {modals: memberModals} = memberPageManager.webapp;

    let callingServiceInstanceId: string;

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    const guestPageManager = PageManager.from(guestPage);
    const {pages: guestPages, modals: guestModals} = guestPageManager.webapp;

    await test.step('Preconditions: Creating preconditions for the test via API', async () => {
      const user = await api.createTeamOwner(teamOwner, teamName);
      teamOwner = {...teamOwner, ...user};
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
          await ownerPageManager.openMainPage();
          await loginUser(teamOwner, ownerPageManager);
          await ownerModals.dataShareConsent().clickDecline();
        })(),

        (async () => {
          await memberPageManager.openMainPage();
          await loginUser(teamMember, memberPageManager);
          await memberModals.dataShareConsent().clickDecline();
        })(),

        (async () => {
          await guestPageManager.openMainPage();
          await loginUser(guestUser, guestPageManager);
          await guestModals.dataShareConsent().clickDecline();
        })(),
      ]);
    });

    await test.step('Users A and B are in a group conversation together', async () => {
      await ownerPages.conversationList().clickCreateGroup();
      await ownerPages.groupCreation().setGroupName(conversationName);
      await ownerPages.startUI().selectUser(teamMember.username);
      await ownerPages.groupCreation().clickCreateGroupButton();
      expect(await ownerPages.conversationList().isConversationItemVisible(conversationName)).toBeTruthy();
    });

    await test.step('User A connects with User C', async () => {
      await ownerComponents.conversationSidebar().clickConnectButton();
      await ownerPages.startUI().searchInput.fill(guestUser.username);
      await ownerPages.startUI().selectUser(guestUser.username);
      await ownerModals.userProfile().clickConnectButton();
      expect(await ownerPages.conversationList().isConversationItemVisible(guestUser.fullName));
      await expect(await guestPageManager.getPage()).toHaveTitle('(1) Wire');

      await guestPages.conversationList().openPendingConnectionRequest();
      await guestPages.connectRequest().clickConnectButton();
    });

    await test.step('User A invites User C to the group', async () => {
      await ownerPages.conversationList().openConversation(conversationName);
      await ownerPages.conversation().clickConversationTitle();
      await ownerPages.conversationDetails().clickAddPeopleButton();
      await ownerPages.conversationDetails().addUsersToConversation([guestUser.fullName]);
      expect(await ownerPages.conversationDetails().isUserPartOfConversationAsMember(guestUser.fullName)).toBeTruthy();
      expect(await ownerPages.conversationDetails().isUserPartOfConversationAsMember(teamMember.fullName)).toBeTruthy();
    });

    await test.step('User C joins the group', async () => {
      expect(await guestPages.conversationList().isConversationItemVisible(conversationName)).toBeTruthy();
    });

    await test.step('User A calls the group', async () => {
      const response = await api.callingService.createInstance(teamMember.password, teamMember.email);
      callingServiceInstanceId = response.id;
      await api.callingService.setAcceptNextCall(callingServiceInstanceId);

      await ownerPages.conversation().clickConversationInfoButton();
      await ownerPages.conversation().clickCallButton();
    });

    await test.step('Team member and guest user answer call from calling notification', async () => {
      // Team member answers the call automatically with the help of Calling Service
      await guestPages.calling().clickAcceptCallButton();
    });

    await test.step('User A switches audio on and sends audio', async () => {});

    await test.step('User B is able to “hear” User A’s audio', async () => {
      await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('User A turns on camera', async () => {
      await ownerPages.calling().clickToggleVideoButton();
    });

    await test.step('User B is able to “see” User A', async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('User A swaps video and audio devices', async () => {
      await ownerComponents.conversationSidebar().clickPreferencesButton();
      await ownerPages.settings().clickAudioVideoSettingsButton();
      await ownerPages.audioVideoSettings().selectMicrophone('Fake Audio Input 2');
      await ownerPages.audioVideoSettings().selectSpeaker('Fake Audio Output 2');
      await ownerPages.audioVideoSettings().selectCamera('Fake Camera 2');
    });

    await test.step("User B is able to 'see' and 'hear' User A's new audio and video", async () => {
      await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('User A turns on screenshare', async () => {
      await ownerPages.calling().clickToggleScreenShareButton();
    });

    await test.step("User B is able to 'see' User A's screen", async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('User A ends call', async () => {
      await ownerPages.calling().clickLeaveCallButton();
    });
  },
);

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, teamOwner);
  await removeCreatedUser(api, teamMember);
});
