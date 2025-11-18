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
import {getImageFilePath, getLocalQRCodeValue, getQRCodeValueFromScreenshot} from 'test/e2e_tests/utils/sendImage.util';
import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDown.util';
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {test, expect} from '../../test.fixtures';

// Generating test data
let ownerA = getUser();
const memberA = getUser();
let ownerB = getUser();
const memberB = getUser();

const teamAName = 'Critical A';
const teamBName = 'Critical B';

const imageFilePath = getImageFilePath();
const videoFilePath = getVideoFilePath();
const audioFilePath = getAudioFilePath();
const textFilePath = getTextFilePath();

let memberBPM: PageManager;

const selfDestructMessageText = 'This message will self-destruct in 10 seconds.';

test('Messages in 1:1', {tag: ['@TC-8750', '@crit-flow-web']}, async ({pageManager, api, browser}) => {
  const {pages, modals, components} = pageManager.webapp;

  // Step 0: Preconditions
  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    // Precondition: Users A and B exist in two separate teams
    const userA = await api.createTeamOwner(ownerA, teamAName);
    ownerA = {...ownerA, ...userA};
    addCreatedTeam(ownerA, ownerA.teamId);
    const invitationIdForMemberA = await api.team.inviteUserToTeam(memberA.email, ownerA);
    const invitationCodeForMemberA = await api.brig.getTeamInvitationCodeForEmail(
      ownerA.teamId,
      invitationIdForMemberA,
    );
    await api.createPersonalUser(memberA, invitationCodeForMemberA);

    const userB = await api.createTeamOwner(ownerB, teamBName);
    ownerB = {...ownerB, ...userB};
    addCreatedTeam(ownerB, ownerB.teamId);

    const invitationIdForMemberB = await api.team.inviteUserToTeam(memberB.email, ownerB);
    const invitationCodeForMemberB = await api.brig.getTeamInvitationCodeForEmail(
      ownerB.teamId,
      invitationIdForMemberB,
    );
    await api.createPersonalUser(memberB, invitationCodeForMemberB);

    // Precondition: Users A and B are connected
    if (!memberA.token) {
      throw new Error(`Member A ${memberA.username} has no token and can't be used for connection`);
    }
    if (!memberB.qualifiedId?.id.length) {
      throw new Error(`Member B ${memberB.username} has no qualifiedId and can't be used for connection`);
    }
    await api.connection.sendConnectionRequest(memberA.token, memberB.qualifiedId.id);
    await api.acceptConnectionRequest(memberB);

    // Create context for member B
    const memberBContext = await browser.newContext();
    const memberBPage = await memberBContext.newPage();
    memberBPM = new PageManager(memberBPage);
  });

  // Step 1: Log in as the users and open the 1:1
  await test.step('Log in as A/B and open the 1:1', async () => {
    await pageManager.openMainPage();
    await loginUser(memberA, pageManager);
    await modals.dataShareConsent().clickDecline();

    await memberBPM.openMainPage();
    await loginUser(memberB, memberBPM);
    await memberBPM.webapp.modals.dataShareConsent().clickDecline();

    // ToDo: Workaround for the MLS Bug [WPB-18227]
    await memberBPM.webapp.modals.unableToOpenConversation().clickAcknowledge();
  });

  // Step 2: Images
  await test.step('User A sends image', async () => {
    await pages.conversationList().openConversation(memberB.fullName);
    await components.inputBarControls().clickShareImage(imageFilePath);
    expect(pages.conversation().isImageFromUserVisible(memberA)).toBeTruthy();
  });
  await test.step('User B can see the image in the conversation', async () => {
    await memberBPM.webapp.pages.conversationList().openConversation(memberA.fullName);

    // TODO: Bug [WPB-18226], remove this when fixed
    await memberBPM.refreshPage({waitUntil: 'load'});

    // Verify that the image is visible in the conversation
    expect(await memberBPM.webapp.pages.conversation().isImageFromUserVisible(memberA)).toBeTruthy();

    // Verify QR Code in the image
    const localQRCodeValue = await getLocalQRCodeValue(imageFilePath);
    const imageScreenshot = await memberBPM.webapp.pages.conversation().getImageScreenshot(memberA);
    const screenshotQRCodeValue = await getQRCodeValueFromScreenshot(imageScreenshot);
    expect(screenshotQRCodeValue).toBe(localQRCodeValue);
  });
  await test.step('User B can open the image preview and see the image', async () => {
    // Click on the image to open it in a preview
    await memberBPM.webapp.pages.conversation().clickImage(memberA);

    // Verify that the detail view modal is visible
    expect(await memberBPM.webapp.modals.detailViewModal().isVisible()).toBeTruthy();
    expect(await memberBPM.webapp.modals.detailViewModal().isImageVisible()).toBeTruthy();
  });
  await test.step('User B can download the image', async () => {
    // Click on the download button to download the image
    const filePath = await memberBPM.webapp.modals.detailViewModal().downloadAsset();
    const downloadQRCodeValue = await getLocalQRCodeValue(filePath);
    const localQRCodeValue = await getLocalQRCodeValue(imageFilePath);
    expect(downloadQRCodeValue).toBe(localQRCodeValue);
  });

  // Step 3: Reactions
  await test.step('User B reacts to A’s image', async () => {
    await memberBPM.webapp.modals.detailViewModal().givePlusOneReaction();
    await memberBPM.webapp.modals.detailViewModal().closeModal();
    expect(await memberBPM.webapp.pages.conversation().isPlusOneReactionVisible()).toBeTruthy();
  });
  await test.step('User A can see the reaction', async () => {
    expect(await pages.conversation().isPlusOneReactionVisible()).toBeTruthy();
  });

  // Step 4: Video Files
  await test.step('User A sends video message', async () => {
    await components.inputBarControls().clickShareFile(videoFilePath);
    expect(await pages.conversation().isVideoMessageVisible()).toBeTruthy();
  });
  await test.step('User B can play the video', async () => {
    await pages.conversation().playVideo();
    // Wait for 5 seconds to ensure video starts playing
    await pages.conversation().page.waitForTimeout(5000);
    // ToDO: Bug -> Video is not loaded from the server, so we cannot check if it is playing
  });

  // Step 5: Audio Files
  await test.step('User A sends audio file', async () => {
    await components.inputBarControls().clickShareFile(audioFilePath);
    expect(await pages.conversation().isAudioMessageVisible()).toBeTruthy();
  });
  await test.step('User B can play the file', async () => {
    await pages.conversation().playAudio();
    // Wait for 5 seconds to ensure audio starts playing
    await pages.conversation().page.waitForTimeout(5000);
    expect(await pages.conversation().isAudioPlaying()).toBeTruthy();
  });

  // Step 6: Ephemeral messages
  await test.step('User A sends a quick (10 sec) self deleting message', async () => {
    await components.inputBarControls().setEphemeralTimerTo('10 seconds');
    await pages.conversation().sendMessage(selfDestructMessageText);
    await expect(pages.conversation().getMessage({content: selfDestructMessageText})).toBeVisible();
  });

  await test.step('User B sees the message', async () => {
    await expect(memberBPM.webapp.pages.conversation().getMessage({content: selfDestructMessageText})).toBeVisible();
  });

  // Step 7: Message removal
  await test.step('Wait 11 seconds', async () => {
    await memberBPM.webapp.pages.conversation().page.waitForTimeout(11_000);
  });
  await test.step('Both users see the message as removed', async () => {
    await expect(
      memberBPM.webapp.pages.conversation().getMessage({content: selfDestructMessageText}),
    ).not.toBeVisible();
    await expect(pages.conversation().getMessage({content: selfDestructMessageText})).not.toBeVisible();

    // Reset ephemeral timer to 'Off'
    await components.inputBarControls().setEphemeralTimerTo('Off');
  });

  // Step 8: Asset sharing
  await test.step('User A sends asset', async () => {
    await components.inputBarControls().clickShareFile(textFilePath);
    expect(await pages.conversation().isFileMessageVisible()).toBeTruthy();
  });
  await test.step('User B can download the file', async () => {
    const filePath = await memberBPM.webapp.pages.conversation().downloadFile();
    expect(await isAssetDownloaded(filePath)).toBeTruthy();
  });
});

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, ownerA);
  await removeCreatedTeam(api, ownerB);
});
