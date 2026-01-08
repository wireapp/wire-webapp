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
import {getImageFilePath, getLocalQRCodeValue, getQRCodeValueFromScreenshot} from 'test/e2e_tests/utils/sendImage.util';

import {test, expect, withLogin, withConnectionRequest} from '../../test.fixtures';

const imageFilePath = getImageFilePath();
const videoFilePath = getVideoFilePath();
const audioFilePath = getAudioFilePath();
const textFilePath = getTextFilePath();

const selfDestructMessageText = 'This message will self-destruct in 10 seconds.';

test('Messages in 1:1', {tag: ['@TC-8750', '@crit-flow-web']}, async ({createTeam, createPage}) => {
  let memberA: User;
  let memberB: User;
  let memberAPageManager: PageManager;
  let memberBPageManager: PageManager;

  // Step 1: Preconditions
  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    // Precondition: Users A and B exist in two separate teams
    const teamA = await createTeam('Critical A', {withMembers: 1});
    memberA = teamA.members[0];

    const teamB = await createTeam('Critical B', {withMembers: 1});
    memberB = teamB.members[0];

    // Create page managers - User A sends connection request to User B
    const [pmA, pmB] = await Promise.all([
      PageManager.from(createPage(withLogin(memberA), withConnectionRequest(memberB))),
      PageManager.from(createPage(withLogin(memberB))),
    ]);
    memberAPageManager = pmA;
    memberBPageManager = pmB;
  });

  // Step 1-1: Preconditions
  await test.step('User B accepts connection request from User A', async () => {
    const {pages} = memberBPageManager.webapp;
    await pages.conversationList().openPendingConnectionRequest();
    await pages.connectRequest().clickConnectButton();
  });

  // Step 2: Images
  await test.step('User A sends image', async () => {
    const {pages, components} = memberAPageManager.webapp;

    // When a conversation between two non team members is created proteus will be used by default and later upgrade to mls.
    // To avoid loosing messages during the fast execution with playwright we wait for the upgrade is finished to open the MLS conversation.
    await pages.conversationList().openConversation(memberB.fullName, {protocol: 'mls'});
    await components.inputBarControls().clickShareImage(imageFilePath);
    expect(await pages.conversation().isImageFromUserVisible(memberA)).toBeTruthy();
  });
  await test.step('User B can see the image in the conversation', async () => {
    await memberBPageManager.webapp.pages.conversationList().openConversation(memberA.fullName, {protocol: 'mls'});

    // Verify that the image is visible in the conversation
    expect(await memberBPageManager.webapp.pages.conversation().isImageFromUserVisible(memberA)).toBeTruthy();

    // Verify QR Code in the image
    const localQRCodeValue = await getLocalQRCodeValue(imageFilePath);
    const imageScreenshot = await memberBPageManager.webapp.pages.conversation().getImageScreenshot(memberA);
    const screenshotQRCodeValue = await getQRCodeValueFromScreenshot(imageScreenshot);
    expect(screenshotQRCodeValue).toBe(localQRCodeValue);
  });
  await test.step('User B can open the image preview and see the image', async () => {
    // Click on the image to open it in a preview
    await memberBPageManager.webapp.pages.conversation().clickImage(memberA);

    // Verify that the detail view modal is visible
    expect(await memberBPageManager.webapp.modals.detailViewModal().isVisible()).toBeTruthy();
    expect(await memberBPageManager.webapp.modals.detailViewModal().isImageVisible()).toBeTruthy();
  });
  await test.step('User B can download the image', async () => {
    // Click on the download button to download the image
    const filePath = await memberBPageManager.webapp.modals.detailViewModal().downloadAsset();
    const downloadQRCodeValue = await getLocalQRCodeValue(filePath);
    const localQRCodeValue = await getLocalQRCodeValue(imageFilePath);
    expect(downloadQRCodeValue).toBe(localQRCodeValue);
  });

  // Step 3: Reactions
  await test.step(`User B reacts to A's image`, async () => {
    await memberBPageManager.webapp.modals.detailViewModal().givePlusOneReaction();
    await memberBPageManager.webapp.modals.detailViewModal().closeModal();
    expect(await memberBPageManager.webapp.pages.conversation().isPlusOneReactionVisible()).toBeTruthy();
  });
  await test.step('User A can see the reaction', async () => {
    const {pages} = memberAPageManager.webapp;
    expect(await pages.conversation().isPlusOneReactionVisible()).toBeTruthy();
  });

  // Step 4: Video Files
  await test.step('User A sends video message', async () => {
    const {pages, components} = memberAPageManager.webapp;
    await components.inputBarControls().clickShareFile(videoFilePath);
    expect(await pages.conversation().isVideoMessageVisible()).toBeTruthy();
  });
  await test.step('User B can play the video', async () => {
    const {pages} = memberBPageManager.webapp;
    await pages.conversation().playVideo();
    // Wait for 5 seconds to ensure video starts playing
    await pages.conversation().page.waitForTimeout(5000);
    // ToDO: Bug -> Video is not loaded from the server, so we cannot check if it is playing
  });

  // Step 5: Audio Files
  await test.step('User A sends audio file', async () => {
    const {pages, components} = memberAPageManager.webapp;
    await components.inputBarControls().clickShareFile(audioFilePath);
    expect(await pages.conversation().isAudioMessageVisible()).toBeTruthy();
  });
  await test.step('User B can play the file', async () => {
    const {pages} = memberAPageManager.webapp;
    await pages.conversation().playAudio();
    // Wait for 5 seconds to ensure audio starts playing
    await pages.conversation().page.waitForTimeout(5000);
    expect(await pages.conversation().isAudioPlaying()).toBeTruthy();
  });

  // Step 6: Ephemeral messages
  await test.step('User A sends a quick (10 sec) self deleting message', async () => {
    const {pages, components} = memberAPageManager.webapp;
    await components.inputBarControls().setEphemeralTimerTo('10 seconds');
    await pages.conversation().sendMessage(selfDestructMessageText);
    await expect(pages.conversation().getMessage({content: selfDestructMessageText})).toBeVisible();
  });

  await test.step('User B sees the message', async () => {
    await expect(
      memberBPageManager.webapp.pages.conversation().getMessage({content: selfDestructMessageText}),
    ).toBeVisible();
  });

  // Step 7: Message removal
  await test.step('Wait 11 seconds', async () => {
    await memberBPageManager.webapp.pages.conversation().page.waitForTimeout(11_000);
  });
  await test.step('Both users see the message as removed', async () => {
    const {pages, components} = memberAPageManager.webapp;
    await expect(
      memberBPageManager.webapp.pages.conversation().getMessage({content: selfDestructMessageText}),
    ).not.toBeVisible();
    await expect(pages.conversation().getMessage({content: selfDestructMessageText})).not.toBeVisible();

    // Reset ephemeral timer to 'Off'
    await components.inputBarControls().setEphemeralTimerTo('Off');
  });

  // Step 8: Asset sharing
  await test.step('User A sends asset', async () => {
    const {pages, components} = memberAPageManager.webapp;
    await components.inputBarControls().clickShareFile(textFilePath);
    expect(await pages.conversation().isFileMessageVisible()).toBeTruthy();
  });
  await test.step('User B can download the file', async () => {
    const filePath = await memberBPageManager.webapp.pages.conversation().downloadFile();
    expect(await isAssetDownloaded(filePath)).toBeTruthy();
  });
});
