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
import {test, expect, withLogin} from '../../test.fixtures';

test(
  'Calls in channels with device switch and screenshare',
  {tag: ['@TC-8755', '@crit-flow-web']},
  async ({createUser, createTeam, createPage, api}) => {
    test.setTimeout(150_000);

    let callingServiceInstanceId: string;
    const channelName = 'Test Channel';

    const member = await createUser();
    const team = await createTeam('Channels Call', {
      users: [member],
      features: {channels: true, mls: true, conferenceCalling: true},
    });
    const owner = team.owner;

    // Member page manager is needed for the channel/calling service to work properly
    const [ownerPageManager] = await Promise.all([
      PageManager.from(createPage(withLogin(owner))),
      // Member logs in but calling service handles call participation
      createPage(withLogin(member)),
    ]);

    const {pages, components, modals} = ownerPageManager.webapp;

    await test.step('Team owner creates a channel with available member', async () => {
      await pages.conversationList().clickCreateGroup();
      await modals.createConversation().createChannel(channelName, {members: [member]});
      await expect(pages.conversationList().getConversationLocator(channelName)).toBeVisible();
    });

    await test.step('Owner starts a call in channel', async () => {
      try {
        const response = await api.callingService.createInstance(member.password, member.email);
        callingServiceInstanceId = response.id;
        await api.callingService.setAcceptNextCall(callingServiceInstanceId);
        await pages.conversationList().getConversationLocator(channelName).open();
        await pages.conversation().clickCallButton();
      } catch (error: unknown) {
        console.error('Error during call initiation:', error);
        throw error;
      }
    });

    await test.step('Member answers call from calling notification', async () => {
      await expect(pages.calling().callCell).toBeVisible();
    });

    await test.step('Owner switches audio on and sends audio', async () => {
      // Presumed automatic from device, skip if not applicable
    });

    await test.step("Member is able to hear Owner's audio", async () => {
      await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner turns on camera', async () => {
      await pages.calling().clickToggleVideoButton();
    });

    await test.step('Member is able to see Owner', async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner swaps audio and video devices', async () => {
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
      await pages.calling().clickToggleScreenShareButton();
    });

    await test.step("Member is able to see Owner's screen", async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner ends call', async () => {
      await pages.calling().clickLeaveCallButton();
    });
  },
);
