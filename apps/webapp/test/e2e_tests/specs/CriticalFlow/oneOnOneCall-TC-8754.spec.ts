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

import {test, expect, withLogin, withConnectionRequest} from '../../test.fixtures';

test(
  '1:1 Video call with device switch and screenshare',
  {tag: ['@TC-8754', '@crit-flow-web']},
  async ({createTeam, createPage, api}) => {
    test.setTimeout(150_000);

    const [{owner: userA}, {owner: userB}] = await Promise.all([createTeam('User A Team'), createTeam('User B Team')]);
    const [userAPageManager, userBPageManager, callingServiceInstanceId] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectionRequest(userB))),
      PageManager.from(createPage(withLogin(userB))),
      api.callingService.createInstance(userB.password, userB.email).then(res => res.id),
    ]);

    await test.step('User B accepts connection request from User A', async () => {
      const {pages} = userBPageManager.webapp;
      await pages.conversationList().openPendingConnectionRequest();
      await pages.connectRequest().clickConnectButton();
    });

    await test.step('User A calls User B', async () => {
      const {pages} = userAPageManager.webapp;
      await api.callingService.setAcceptNextCall(callingServiceInstanceId);

      await pages.conversationList().openConversation(userB.fullName);
      await pages.conversation().clickConversationInfoButton();
      await pages.conversation().clickCallButton();
    });

    await test.step('User B answers call from calling notification', async () => {
      const {pages} = userAPageManager.webapp;
      // answering happens automatically calling service
      await expect(pages.calling().callCell).toBeVisible();
    });

    await test.step('User A switches audio on and sends audio', async () => {
      // Presumed automatic from device, skip if not applicable
    });

    await test.step("User B is able to hear User A's audio", async () => {
      await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('User A turns on camera', async () => {
      const {pages} = userAPageManager.webapp;
      await pages.calling().clickToggleVideoButton();
    });

    await test.step('User B is able to see User A', async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('User A swaps audio and video devices', async () => {
      const {pages, components} = userAPageManager.webapp;
      await components.conversationSidebar().clickPreferencesButton();
      await pages.settings().clickAudioVideoSettingsButton();
      await pages.audioVideoSettings().selectMicrophone('Fake Audio Input 2');
      await pages.audioVideoSettings().selectSpeaker('Fake Audio Output 2');
      await pages.audioVideoSettings().selectCamera('Fake Camera 2');
    });

    await test.step('User B is able to hear and see User A with new devices', async () => {
      await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('User A turns on screenshare', async () => {
      const {pages} = userAPageManager.webapp;
      await pages.calling().clickToggleScreenShareButton();
    });

    await test.step("User B is able to see User A's screen", async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('User A ends call', async () => {
      const {pages} = userAPageManager.webapp;
      await pages.calling().clickLeaveCallButton();
    });
  },
);
