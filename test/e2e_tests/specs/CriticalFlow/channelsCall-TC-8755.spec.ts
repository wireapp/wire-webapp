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
import {inviteMembers} from 'test/e2e_tests/utils/userActions';

import {test, expect} from '../../test.fixtures';

let owner = getUser();
owner.firstName = 'integrationtest';
owner.lastName = 'integrationtest';
owner.fullName = 'integrationtest';

const member = getUser();
const channelName = 'Test Channel';

const teamName = 'Channels Call';

test(
  'Calls in channels with device switch and screenshare',
  {tag: ['@TC-8754', '@crit-flow-web']},
  async ({browser, pageManager: ownerPageManager, api}) => {
    test.setTimeout(150_000);

    const {pages: ownerPages, components: ownerComponents} = ownerPageManager.webapp;

    await addMockCamerasToContext(ownerPageManager.getContext());

    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    const memberPageManager = PageManager.from(memberPage);

    let callingServiceInstanceId: string;

    await test.step('Preconditions: Team owner create a channels enabled team', async () => {
      const user = await api.createTeamOwner(owner, teamName);
      owner = {...owner, ...user};
      addCreatedTeam(owner, owner.teamId);
      await inviteMembers([member], owner, api);

      // TODO: Remove below line when we have a SQS workaround
      await api.brig.enableMLSFeature(owner.teamId);
      await api.brig.unlockChannelFeature(owner.teamId);
      await api.brig.enableChannelsFeature(owner.teamId);
      await api.enableConferenceCallingFeature(owner.teamId);
      await ownerPageManager.waitForTimeout(5000);
    });

    await test.step('Owner and member login', async () => {
      await Promise.all([await completeLogin(ownerPageManager, owner), await completeLogin(memberPageManager, member)]);
    });

    await test.step('Team owner creates a channel with available member', async () => {
      const page = await ownerPageManager.getPage();
      await page.screenshot({path: 'playwright-report/screenshots'});
      await ownerPages.conversationList().clickCreateGroup();
      await page.screenshot({path: 'playwright-report/screenshots'});
      await ownerPages.groupCreation().setGroupName(channelName);
      await ownerPageManager.waitForTimeout(3000);
      await page.screenshot({path: 'playwright-report/screenshots'});
      await ownerPages.groupCreation().clickNextButton();
      await ownerPages.startUI().selectUsers([member.username]);
      await ownerPages.groupCreation().clickCreateGroupButton();
      await ownerPages.groupCreation().waitForModalClose();
      expect(await ownerPages.conversationList().isConversationItemVisible(channelName)).toBeTruthy();
    });

    await test.step('Owner starts a call in channel', async () => {
      try {
        const response = await api.callingService.createInstance(member.password, member.email);
        callingServiceInstanceId = response.id;
        await api.callingService.setAcceptNextCall(callingServiceInstanceId);
        await ownerPages.conversationList().openConversation(channelName);
        await ownerPages.conversation().clickConversationInfoButton();
        await ownerPages.conversation().clickCallButton();
      } catch (error) {
        console.error('Error during call initiation:', error);
        throw error;
      }
    });

    await test.step('Member answers call from calling notification', async () => {
      // answering happens automatically calling service
      await ownerPages.calling().waitForCell();
      expect(await ownerPages.calling().isCellVisible()).toBeTruthy();
      await ownerPages.calling().waitForGoFullScreen();
    });

    await test.step('Owner switches audio on and sends audio', async () => {
      // Presumed automatic from device, skip if not applicable
    });

    await test.step("Member is able to hear Owner's audio", async () => {
      await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner turns on camera', async () => {
      await ownerPages.calling().clickToggleVideoButton();
    });

    await test.step('Member is able to see Owner', async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner swaps audio and video devices', async () => {
      await ownerComponents.conversationSidebar().clickPreferencesButton();
      await ownerPages.settings().clickAudioVideoSettingsButton();
      await ownerPages.audioVideoSettings().selectMicrophone('Fake Audio Input 2');
      await ownerPages.audioVideoSettings().selectSpeaker('Fake Audio Output 2');
      await ownerPages.audioVideoSettings().selectCamera('Fake Camera 2');
    });

    await test.step('Member is able to hear and see Owner with new devices', async () => {
      await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner turns on screenshare', async () => {
      await ownerPages.calling().clickToggleScreenShareButton();
    });

    await test.step("Member is able to see Owner's screen", async () => {
      await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
    });

    await test.step('Owner ends call', async () => {
      await ownerPages.calling().clickLeaveCallButton();
    });
  },
);

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, owner);
});
