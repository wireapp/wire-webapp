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

import {test, expect, withLogin, withConnectionRequest} from '../../test.fixtures';
import {createGroup} from 'test/e2e_tests/utils/userActions';

const conversationName = 'CritiCall';

// ToDo(WPB-22442): Backoffice does not unlock calling feature for teams created during tests
test.fixme(
  'Group Video call',
  {tag: ['@TC-8637', '@crit-flow-web']},
  async ({createTeam, createUser, createPage, api}) => {
    test.setTimeout(150_000);

    let teamOwner: User;
    let teamMember: User;
    let guestUser: User;
    let ownerPageManager: PageManager;
    let guestPageManager: PageManager;
    let callingServiceInstanceId: string;

    await test.step('Preconditions: Creating preconditions for the test via API', async () => {
      const team = await createTeam('Critical', {withMembers: 1});
      teamOwner = team.owner;
      teamMember = team.members[0];

      await api.enableConferenceCallingFeature(teamOwner.teamId!);

      guestUser = await createUser();

      const [pmOwner, pmGuest] = await Promise.all([
        PageManager.from(createPage(withLogin(teamOwner), withConnectionRequest(guestUser))),
        PageManager.from(createPage(withLogin(guestUser))),
      ]);
      ownerPageManager = pmOwner;
      guestPageManager = pmGuest;
    });

    await test.step('Guest user accepts connection request from owner', async () => {
      const {pages} = guestPageManager.webapp;
      await pages.conversationList().openPendingConnectionRequest();
      await pages.connectRequest().clickConnectButton();
    });

    await test.step('Owner and team member are in a group conversation together', async () => {
      const {pages} = ownerPageManager.webapp;
      await createGroup(pages, conversationName, [teamMember]);
      expect(await pages.conversationList().isConversationItemVisible(conversationName)).toBeTruthy();
    });

    await test.step('Owner invites guest user to the group', async () => {
      const {pages} = ownerPageManager.webapp;
      await pages.conversationList().openConversation(conversationName);
      await pages.conversation().clickConversationTitle();
      await pages.conversationDetails().clickAddPeopleButton();
      await pages.conversationDetails().addUsersToConversation([guestUser.fullName]);
      expect(await pages.conversationDetails().isUserPartOfConversationAsMember(guestUser.fullName)).toBeTruthy();
      expect(await pages.conversationDetails().isUserPartOfConversationAsMember(teamMember.fullName)).toBeTruthy();
    });

    await test.step('Guest user joins the group', async () => {
      const {pages} = guestPageManager.webapp;
      expect(await pages.conversationList().isConversationItemVisible(conversationName)).toBeTruthy();
    });

    await test.step('Owner calls the group', async () => {
      const {pages} = ownerPageManager.webapp;
      const response = await api.callingService.createInstance(teamMember.password, teamMember.email);
      callingServiceInstanceId = response.id;
      await api.callingService.setAcceptNextCall(callingServiceInstanceId);

      await pages.conversation().clickConversationInfoButton();
      await pages.conversation().clickCallButton();
    });

    await test.step('Team member and guest user answer call from calling notification', async () => {
      const {pages} = guestPageManager.webapp;
      // Team member answers the call automatically with the help of Calling Service
      await pages.calling().clickAcceptCallButton();
    });

    await test.step('Owner switches audio on and sends audio', async () => {});

    await test.step(`Team member is able to "hear" owner's audio`, async () => {
      await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner turns on camera', async () => {
      const {pages} = ownerPageManager.webapp;
      await pages.calling().clickToggleVideoButton();
    });

    await test.step('Team member is able to "see" owner', async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner swaps video and audio devices', async () => {
      const {pages, components} = ownerPageManager.webapp;
      await components.conversationSidebar().clickPreferencesButton();
      await pages.settings().clickAudioVideoSettingsButton();
      await pages.audioVideoSettings().selectMicrophone('Fake Audio Input 2');
      await pages.audioVideoSettings().selectSpeaker('Fake Audio Output 2');
      await pages.audioVideoSettings().selectCamera('Fake Camera 2');
    });

    await test.step("Team member is able to 'see' and 'hear' owner's new audio and video", async () => {
      await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner turns on screenshare', async () => {
      const {pages} = ownerPageManager.webapp;
      await pages.calling().clickToggleScreenShareButton();
    });

    await test.step("Team member is able to 'see' owner's screen", async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner ends call', async () => {
      const {pages} = ownerPageManager.webapp;
      await pages.calling().clickLeaveCallButton();
    });
  },
);
