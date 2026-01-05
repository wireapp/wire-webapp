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
import {getVideoFilePath, getAudioFilePath, getTextFilePath, isAssetDownloaded} from 'test/e2e_tests/utils/asset.util';
import {getImageFilePath, getLocalQRCodeValue} from 'test/e2e_tests/utils/sendImage.util';

import {test, expect, withLogin} from '../../test.fixtures';

const channelName = 'Critical Channel';
const messageText = 'Hello, this is a test message!';

// Used in disabled steps
const selfDestructMessageText = 'This message will self-destruct in 10 seconds.';
const imageFilePath = getImageFilePath();
const videoFilePath = getVideoFilePath();
const audioFilePath = getAudioFilePath();
const textFilePath = getTextFilePath();

test('Messages in Channels', {tag: ['@TC-8753', '@crit-flow-web']}, async ({createTeam, createPage, api}) => {
  let userA: User;
  let userB: User;
  let userAPageManager: PageManager;
  let userBPageManager: PageManager;

  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    const team = await createTeam('Critical Team', {withMembers: 1});
    userA = team.owner;
    userB = team.members[0];

    // TODO: Remove below line when we have a SQS workaround
    await api.brig.enableMLSFeature(userA.teamId);
    await api.brig.unlockChannelFeature(userA.teamId);
    await api.brig.enableChannelsFeature(userA.teamId);

    const [pmA, pmB] = await Promise.all([
      PageManager.from(createPage(withLogin(userA))),
      PageManager.from(createPage(withLogin(userB))),
    ]);
    userAPageManager = pmA;
    userBPageManager = pmB;
  });

  await test.step('User A creates a channel with User B', async () => {
    const {pages} = userAPageManager.webapp;
    await pages.conversationList().clickCreateGroup();
    await pages.groupCreation().setGroupName(channelName);
    await pages.groupCreation().clickNextButton();
    await pages.startUI().selectUsers([userB.username]);
    await pages.groupCreation().clickCreateGroupButton();
  });

  await test.step('User A mentions User B in the channel', async () => {
    const {pages} = userAPageManager.webapp;
    await pages.conversationList().openConversation(channelName);
    await pages.conversation().sendMessageWithUserMention(userB.fullName, messageText);
  });

  await test.step('User B should receive mention', async () => {
    const {pages} = userBPageManager.webapp;
    expect(await pages.conversationList().doesConversationHasMentionIndicator(channelName)).toBeTruthy();

    await pages.conversationList().openConversation(channelName);
    await expect(pages.conversation().getMessage({content: `@${userB.fullName} ${messageText}`})).toBeVisible();
  });

  await test.step('User A sends image', async () => {
    const {pages, components} = userAPageManager.webapp;
    await pages.conversationList().openConversation(channelName);
    await components.inputBarControls().clickShareImage(imageFilePath);

    expect(await userBPageManager.webapp.pages.conversation().isImageFromUserVisible(userA)).toBeTruthy();
  });

  await test.step('User B can open the image preview and see the image', async () => {
    const {pages, modals} = userBPageManager.webapp;
    // Click on the image to open it in a preview
    await pages.conversation().clickImage(userA);
    // Verify that the detail view modal is visible
    await modals.detailViewModal().waitForVisibility();
    expect(await modals.detailViewModal().isVisible()).toBeTruthy();
    expect(await modals.detailViewModal().isImageVisible()).toBeTruthy();
  });

  await test.step('User B can download the image', async () => {
    const {modals} = userBPageManager.webapp;
    // Click on the download button to download the image
    const filePath = await modals.detailViewModal().downloadAsset();
    const downloadQRCodeValue = await getLocalQRCodeValue(filePath);
    const localQRCodeValue = await getLocalQRCodeValue(imageFilePath);
    expect(downloadQRCodeValue).toBe(localQRCodeValue);
  });

  await test.step(`User B reacts to A's image`, async () => {
    const {pages, modals} = userBPageManager.webapp;
    await modals.detailViewModal().givePlusOneReaction();
    await modals.detailViewModal().closeModal();
    expect(await pages.conversation().isPlusOneReactionVisible()).toBeTruthy();
  });

  await test.step('User A can see the reaction', async () => {
    const {pages} = userAPageManager.webapp;
    expect(await pages.conversation().isPlusOneReactionVisible()).toBeTruthy();
  });

  await test.step('User A sends video message', async () => {
    const {pages, components} = userAPageManager.webapp;
    await components.inputBarControls().clickShareFile(videoFilePath);
    expect(await pages.conversation().isVideoMessageVisible()).toBeTruthy();
  });

  await test.step('User B can play the received video', async () => {
    const {pages} = userBPageManager.webapp;
    await pages.conversation().playVideo();
    // Wait for 5 seconds to ensure video starts playing
    await pages.conversation().page.waitForTimeout(5000);
    // ToDO: Bug -> Video is not loaded from the server, so we cannot check if it is playing
  });

  await test.step('User A sends audio file', async () => {
    const {pages, components} = userAPageManager.webapp;
    await components.inputBarControls().clickShareFile(audioFilePath);
    expect(await pages.conversation().isAudioMessageVisible()).toBeTruthy();
  });

  await test.step('User B can play the audio file', async () => {
    const {pages} = userBPageManager.webapp;
    await pages.conversation().playAudio();
    // Wait for 5 seconds to ensure audio starts playing
    await pages.conversation().page.waitForTimeout(3000);
    expect(await pages.conversation().isAudioPlaying()).toBeTruthy();
  });

  await test.step('User A sends a quick (10 sec) self deleting message', async () => {
    const {pages, components} = userAPageManager.webapp;
    await components.inputBarControls().setEphemeralTimerTo('10 seconds');
    await pages.conversation().sendMessage(selfDestructMessageText);
    await expect(pages.conversation().getMessage({content: selfDestructMessageText})).toBeVisible();
  });

  await test.step('User B sees the message', async () => {
    const {pages} = userBPageManager.webapp;
    await expect(pages.conversation().getMessage({content: selfDestructMessageText})).toBeVisible();
  });

  await test.step('User B waits 10 seconds', async () => {
    await userBPageManager.webapp.pages.conversation().page.waitForTimeout(11_000);
  });

  await test.step('Both users see the message as removed', async () => {
    await expect(
      userBPageManager.webapp.pages.conversation().getMessage({content: selfDestructMessageText}),
    ).not.toBeVisible();
    await expect(
      userAPageManager.webapp.pages.conversation().getMessage({content: selfDestructMessageText}),
    ).not.toBeVisible();

    // Reset ephemeral timer to 'Off'
    await userAPageManager.webapp.components.inputBarControls().setEphemeralTimerTo('Off');
  });

  await test.step('User A sends asset', async () => {
    const {pages, components} = userAPageManager.webapp;
    await components.inputBarControls().clickShareFile(textFilePath);
    expect(await pages.conversation().isFileMessageVisible()).toBeTruthy();
  });

  await test.step('User B can download the file', async () => {
    const {pages} = userBPageManager.webapp;
    const filePath = await pages.conversation().downloadFile();
    expect(await isAssetDownloaded(filePath)).toBeTruthy();
  });
});
