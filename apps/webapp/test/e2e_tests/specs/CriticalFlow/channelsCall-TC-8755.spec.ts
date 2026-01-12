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
import {addMockCamerasToContext} from 'test/e2e_tests/utils/mockVideoDevice.util';

import {test, expect, withLogin} from '../../test.fixtures';

const channelName = 'Test Channel';

// ToDo(WPB-22442): Backoffice does not unlock calling feature for teams created during tests
test.fixme(
  'Calls in channels with device switch and screenshare',
  {tag: ['@TC-8754', '@crit-flow-web']},
  async ({createTeam, createPage, api}) => {
    test.setTimeout(150_000);

    let owner: User;
    let member: User;
    let ownerPageManager: PageManager;
    let callingServiceInstanceId: string;

    await test.step('Preconditions: Team owner creates a channels enabled team', async () => {
      const team = await createTeam('Channels Call', {withMembers: 1});
      owner = team.owner;
      member = team.members[0];

      await api.brig.enableMLSFeature(owner.teamId);
      await api.brig.unlockChannelFeature(owner.teamId);
      await api.brig.enableChannelsFeature(owner.teamId);
      await api.enableConferenceCallingFeature(owner.teamId);

      // Create page managers for both owner and member
      // Member page manager is needed for the channel/calling service to work properly
      await Promise.all([
        PageManager.from(createPage(withLogin(owner))).then(async pm => {
          ownerPageManager = pm;
          await addMockCamerasToContext(ownerPageManager.getContext());
        }),
        // Member logs in but calling service handles call participation
        createPage(withLogin(member)),
      ]);
    });

    await test.step('Team owner creates a channel with available member', async () => {
      const {pages} = ownerPageManager.webapp;
      await pages.conversationList().clickCreateGroup();
      await pages.groupCreation().setGroupName(channelName);
      await pages.groupCreation().clickNextButton();
      await pages.startUI().selectUsers(member.username);
      await pages.groupCreation().clickCreateGroupButton();
      await pages.groupCreation().waitForModalClose();
      expect(await pages.conversationList().isConversationItemVisible(channelName)).toBeTruthy();
    });

    await test.step('Owner starts a call in channel', async () => {
      const {pages} = ownerPageManager.webapp;
      try {
        const response = await api.callingService.createInstance(member.password, member.email);
        callingServiceInstanceId = response.id;
        await api.callingService.setAcceptNextCall(callingServiceInstanceId);
        await pages.conversationList().openConversation(channelName);
        await pages.conversation().clickConversationInfoButton();
        await pages.conversation().clickCallButton();
      } catch (error) {
        console.error('Error during call initiation:', error);
        throw error;
      }
    });

    await test.step('Member answers call from calling notification', async () => {
      const {pages} = ownerPageManager.webapp;
      // answering happens automatically calling service
      await pages.calling().waitForCell();
      expect(await pages.calling().isCellVisible()).toBeTruthy();
    });

    await test.step('Owner switches audio on and sends audio', async () => {
      // Presumed automatic from device, skip if not applicable
    });

    await test.step("Member is able to hear Owner's audio", async () => {
      await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner turns on camera', async () => {
      const {pages} = ownerPageManager.webapp;
      await pages.calling().clickToggleVideoButton();
    });

    await test.step('Member is able to see Owner', async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner swaps audio and video devices', async () => {
      const {pages, components} = ownerPageManager.webapp;
      await components.conversationSidebar().clickPreferencesButton();
      await pages.settings().clickAudioVideoSettingsButton();
      await pages.audioVideoSettings().selectMicrophone('Fake Audio Input 2');
      await pages.audioVideoSettings().selectSpeaker('Fake Audio Output 2');
      await pages.audioVideoSettings().selectCamera('Fake Camera 2');
    });

    await test.step('Member is able to hear and see Owner with new devices', async () => {
      await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner turns on screenshare', async () => {
      const {pages} = ownerPageManager.webapp;
      await pages.calling().clickToggleScreenShareButton();
    });

    await test.step("Member is able to see Owner's screen", async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner ends call', async () => {
      const {pages} = ownerPageManager.webapp;
      await pages.calling().clickLeaveCallButton();
    });
  },
);
