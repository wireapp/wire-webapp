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
import {getVideoFilePath, getAudioFilePath, getTextFilePath, isAssetDownloaded} from 'test/e2e_tests/utils/asset.util';
import {getImageFilePath, getLocalQRCodeValue} from 'test/e2e_tests/utils/sendImage.util';
import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDown.util';
import {inviteMembers, loginUser} from 'test/e2e_tests/utils/userActions';

import {test, expect} from '../../test.fixtures';

// User A is a team owner, User B is a team member
let userA = getUser();
const userB = getUser();

const teamName = 'Critical Team';
const channelName = 'Critical Channel';
const messageText = 'Hello, this is a test message!';

// Used in disabled steps
const selfDestructMessageText = 'This message will self-destruct in 10 seconds.';
const imageFilePath = getImageFilePath();
const videoFilePath = getVideoFilePath();
const audioFilePath = getAudioFilePath();
const textFilePath = getTextFilePath();

test(
  'Messages in Channels',
  {tag: ['@TC-8753', '@crit-flow-web']},
  async ({pageManager: userAPageManager, browser, api}) => {
    const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;

    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();
    const userBPageManager = new PageManager(userBPage);

    const {pages: userBPages, modals: userBModals} = userBPageManager.webapp;

    await test.step('Preconditions: Creating preconditions for the test via API', async () => {
      const user = await api.createTeamOwner(userA, teamName);
      userA = {...userA, ...user};
      addCreatedTeam(userA, userA.teamId!);
      await inviteMembers([userB], userA, api);

      // TODO: Remove below line when we have a SQS workaround
      await api.brig.enableMLSFeature(userA.teamId);
      await api.brig.unlockChannelFeature(userA.teamId);
      await api.brig.enableChannelsFeature(userA.teamId);
      // timeout waiter

      await userAPageManager.waitForTimeout(3000);
    });

    await test.step('Users A and B log in and open the channel', async () => {
      const setupOwner = async () => {
        await userAPageManager.openMainPage();
        await loginUser(userA, userAPageManager);
        await userAModals.dataShareConsent().clickDecline();
        await userAPages.conversationList().clickCreateGroup();
        await userAPages.groupCreation().setGroupName(channelName);
        await userAPages.groupCreation().clickNextButton();
        await userAPages.startUI().selectUsers([userB.username]);
        await userAPages.groupCreation().clickCreateGroupButton();
      };

      const setupMember = async () => {
        await userBPageManager.openMainPage();
        await loginUser(userB, userBPageManager);
        await userBModals.dataShareConsent().clickDecline();
      };

      await Promise.all([setupOwner(), setupMember()]);
    });

    await test.step('User A mentions User B in the channel', async () => {
      await userAPages.conversationList().openConversation(channelName);
      await userAPages.conversation().sendMessageWithUserMention(userB.fullName, messageText);
    });

    await test.step('User B should receive mention', async () => {
      expect(await userBPages.conversationList().doesConversationHasMentionIndicator(channelName)).toBeTruthy();

      // TODO: Bug [WPB-18226], remove this when fixed
      await userBPageManager.refreshPage({waitUntil: 'load'});

      await userBPages.conversationList().openConversation(channelName);
      await expect(userBPages.conversation().getMessage(`@${userB.fullName} ${messageText}`)).toBeVisible();
    });

    await test.step('User A sends image', async () => {
      await userAPages.conversationList().openConversation(channelName);
      await userAComponents.inputBarControls().clickShareImage(imageFilePath);

      expect(await userBPages.conversation().isImageFromUserVisible(userA)).toBeTruthy();
    });

    await test.step('User B can open the image preview and see the image', async () => {
      // Click on the image to open it in a preview
      await userBPages.conversation().clickImage(userA);
      // Verify that the detail view modal is visible
      await userBModals.detailViewModal().waitForVisibility();
      expect(await userBModals.detailViewModal().isVisible()).toBeTruthy();
      expect(await userBModals.detailViewModal().isImageVisible()).toBeTruthy();
    });

    await test.step('User B can download the image', async () => {
      // Click on the download button to download the image
      const filePath = await userBModals.detailViewModal().downloadAsset();
      const downloadQRCodeValue = await getLocalQRCodeValue(filePath);
      const localQRCodeValue = await getLocalQRCodeValue(imageFilePath);
      expect(downloadQRCodeValue).toBe(localQRCodeValue);
    });

    await test.step('User B reacts to A’s image', async () => {
      await userBModals.detailViewModal().givePlusOneReaction();
      await userBModals.detailViewModal().closeModal();
      expect(await userBPages.conversation().isPlusOneReactionVisible()).toBeTruthy();
    });

    await test.step('User A can see the reaction', async () => {
      expect(await userAPages.conversation().isPlusOneReactionVisible()).toBeTruthy();
    });

    await test.step('User A sends video message', async () => {
      await userAComponents.inputBarControls().clickShareFile(videoFilePath);
      expect(await userAPages.conversation().isVideoMessageVisible()).toBeTruthy();
    });

    await test.step('User B can play the received video', async () => {
      await userBPages.conversation().playVideo();
      // Wait for 5 seconds to ensure video starts playing
      await userBPages.conversation().page.waitForTimeout(5000);
      // ToDO: Bug -> Video is not loaded from the server, so we cannot check if it is playing
    });

    await test.step('User A sends audio file', async () => {
      await userAComponents.inputBarControls().clickShareFile(audioFilePath);
      expect(await userAPages.conversation().isAudioMessageVisible()).toBeTruthy();
    });

    await test.step('User B can play the audio file', async () => {
      await userBPages.conversation().playAudio();
      // Wait for 5 seconds to ensure audio starts playing
      await userBPages.conversation().page.waitForTimeout(3000);
      expect(await userBPages.conversation().isAudioPlaying()).toBeTruthy();
    });

    await test.step('User A sends a quick (10 sec) self deleting message', async () => {
      await userAComponents.inputBarControls().setEphemeralTimerTo('10 seconds');
      await userAPages.conversation().sendMessage(selfDestructMessageText);
      await expect(userAPages.conversation().getMessage(selfDestructMessageText)).toBeVisible();
    });

    await test.step('User B sees the message', async () => {
      await expect(userBPages.conversation().getMessage(selfDestructMessageText)).toBeVisible();
    });

    await test.step('User B waits 10 seconds', async () => {
      await userBPages.conversation().page.waitForTimeout(11_000);
    });

    await test.step('Both users see the message as removed', async () => {
      await expect(userBPages.conversation().getMessage(selfDestructMessageText)).not.toBeVisible();
      await expect(userAPages.conversation().getMessage(selfDestructMessageText)).not.toBeVisible();

      // Reset ephemeral timer to 'Off'
      await userAComponents.inputBarControls().setEphemeralTimerTo('Off');
    });

    await test.step('User A sends asset', async () => {
      await userAComponents.inputBarControls().clickShareFile(textFilePath);
      expect(await userAPages.conversation().isFileMessageVisible()).toBeTruthy();
    });

    await test.step('User B can download the file', async () => {
      const filePath = await userBPages.conversation().downloadFile();
      expect(await isAssetDownloaded(filePath)).toBeTruthy();
    });
  },
);

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, userA);
});
