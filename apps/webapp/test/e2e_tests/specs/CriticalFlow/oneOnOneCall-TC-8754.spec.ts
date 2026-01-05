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
import {completeLogin} from 'test/e2e_tests/utils/setup.util';
import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDown.util';

import {test, expect} from '../../test.fixtures';

let ownerA = getUser();
let ownerB = getUser();

const teamAName = 'Direct Call A';
const teamBName = 'Direct Call B';

test(
  '1:1 Video call with device switch and screenshare',
  {tag: ['@TC-8754', '@crit-flow-web']},
  async ({browser, pageManager: ownerAPageManager, api}) => {
    test.setTimeout(150_000);

    const {pages: ownerAPages, modals: ownerAModals, components: ownerAComponents} = ownerAPageManager.webapp;

    await addMockCamerasToContext(ownerAPageManager.getContext());

    const ownerBContext = await browser.newContext();
    const ownerBPage = await ownerBContext.newPage();
    const ownerBPageManager = PageManager.from(ownerBPage);
    const {pages: ownerBPages} = ownerBPageManager.webapp;

    let callingServiceInstanceId: string;

    await test.step('Preconditions: Creating two separate teams and users via API', async () => {
      const user = await api.createTeamOwner(ownerA, teamAName);
      ownerA = {...ownerA, ...user};
      addCreatedTeam(ownerA, ownerA.teamId!);
      await api.enableConferenceCallingFeature(ownerA.teamId!);

      const userB = await api.createTeamOwner(ownerB, teamBName);
      ownerB = {...ownerB, ...userB};
      addCreatedTeam(ownerB, ownerB.teamId!);
      await api.enableConferenceCallingFeature(ownerB.teamId!);
    });

    await test.step('Users A and B are logged in', async () => {
      await Promise.all([completeLogin(ownerAPageManager, ownerA), completeLogin(ownerBPageManager, ownerB)]);
    });

    // user A finds user B and sends a connection request
    await test.step('User A connects with User B', async () => {
      await ownerAComponents.conversationSidebar().clickConnectButton();
      await ownerAPages.startUI().searchInput.fill(ownerB.username);
      await ownerAPages.startUI().selectUser(ownerB.username);
      await ownerAModals.userProfile().clickConnectButton();

      expect(await ownerAPages.conversationList().isConversationItemVisible(ownerB.fullName));
      await expect(ownerBPage).toHaveTitle('(1) Wire');

      await ownerBPages.conversationList().openPendingConnectionRequest();
      await ownerBPages.connectRequest().clickConnectButton();
    });

    await test.step('User A calls User B', async () => {
      try {
        const response = await api.callingService.createInstance(ownerB.password, ownerB.email);
        callingServiceInstanceId = response.id;
        await api.callingService.setAcceptNextCall(callingServiceInstanceId);
        await ownerAPages.conversationList().openConversation(ownerB.fullName);
        await ownerAPages.conversation().clickConversationInfoButton();
        await ownerAPages.conversation().clickCallButton();
      } catch (error) {
        console.error('Error during call initiation:', error);
        throw error;
      }
    });

    await test.step('User B answers call from calling notification', async () => {
      // answering happens automatically calling service
      await ownerAPages.calling().waitForCell();
      expect(await ownerAPages.calling().isCellVisible()).toBeTruthy();
    });

    await test.step('User A switches audio on and sends audio', async () => {
      // Presumed automatic from device, skip if not applicable
    });

    await test.step("User B is able to hear User A's audio", async () => {
      await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('User A turns on camera', async () => {
      await ownerAPages.calling().clickToggleVideoButton();
    });

    await test.step('User B is able to see User A', async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('User A swaps audio and video devices', async () => {
      await ownerAComponents.conversationSidebar().clickPreferencesButton();
      await ownerAPages.settings().clickAudioVideoSettingsButton();
      await ownerAPages.audioVideoSettings().selectMicrophone('Fake Audio Input 2');
      await ownerAPages.audioVideoSettings().selectSpeaker('Fake Audio Output 2');
      await ownerAPages.audioVideoSettings().selectCamera('Fake Camera 2');
    });

    await test.step('User B is able to hear and see User A with new devices', async () => {
      await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('User A turns on screenshare', async () => {
      await ownerAPages.calling().clickToggleScreenShareButton();
    });

    await test.step("User B is able to see User A's screen", async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('User A ends call', async () => {
      await ownerAPages.calling().clickLeaveCallButton();
    });
  },
);

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, ownerA);
  await removeCreatedTeam(api, ownerB);
});
