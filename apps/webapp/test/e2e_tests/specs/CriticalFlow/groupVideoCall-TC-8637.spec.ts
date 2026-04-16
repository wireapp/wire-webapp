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
import {createGroup} from 'test/e2e_tests/utils/userActions';

test('Group Video call', {tag: ['@TC-8637', '@crit-flow-web']}, async ({createTeam, createUser, createPage, api}) => {
  test.setTimeout(150_000);
  let callingServiceInstanceId: string;

  const conversationName = 'CriticalCall';
  const teamMember = await createUser();
  const guestUser = await createUser();
  const team = await createTeam('Critical', {users: [teamMember], features: {conferenceCalling: true}});
  const teamOwner = team.owner;

  const [ownerPageManager, guestPageManager] = await Promise.all([
    PageManager.from(createPage(withLogin(teamOwner), withConnectionRequest(guestUser))),
    PageManager.from(createPage(withLogin(guestUser))),
  ]);

  const ownerPages = ownerPageManager.webapp.pages;
  const guestPages = guestPageManager.webapp.pages;

  await test.step('Guest user accepts connection request from owner', async () => {
    await guestPages.conversationList().openPendingConnectionRequest();
    await guestPages.connectRequest().clickConnectButton();
  });

  await test.step('Owner and team member are in a group conversation together', async () => {
    await createGroup(ownerPages, conversationName, [teamMember]);
  });

  await test.step('Owner invites guest user to the group', async () => {
    await ownerPages.conversationList().openConversation(conversationName);
    await ownerPages.conversation().clickConversationTitle();
    await ownerPages.conversationDetails().clickAddPeopleButton();
    await ownerPages.conversationDetails().addUsersToConversation([guestUser.fullName]);
    await expect(ownerPages.conversationDetails().groupMembers.filter({hasText: guestUser.fullName})).toBeVisible();
    await expect(ownerPages.conversationDetails().groupMembers.filter({hasText: teamMember.fullName})).toBeVisible();
  });

  await test.step('Guest user joins the group', async () => {
    await expect(guestPages.conversationList().getConversationLocator(conversationName)).toBeVisible();
  });

  await test.step('Owner calls the group', async () => {
    const response = await api.callingService.createInstance(teamMember.password, teamMember.email);
    callingServiceInstanceId = response.id;
    await api.callingService.setAcceptNextCall(callingServiceInstanceId);
    await ownerPages.conversation().clickCallButton();
    await expect(ownerPages.calling().callCell).toBeVisible();
  });

  await test.step('Team member and guest user answer call from calling notification', async () => {
    // Team member answers the call automatically with the help of Calling Service
    await guestPages.calling().clickAcceptCallButton();
  });

  await test.step('Owner switches audio on and sends audio', async () => {});

  await test.step(`Team member is able to "hear" owner's audio`, async () => {
    await api.callingService.verifyAudioIsBeingReceived(callingServiceInstanceId);
  });

  await test.step('Owner turns on camera', async () => {
    await ownerPages.calling().clickToggleVideoButton();
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
    await ownerPages.calling().clickToggleScreenShareButton();
  });

  await test.step("Team member is able to 'see' owner's screen", async () => {
    await api.callingService.verifyVideoIsBeingReceived(callingServiceInstanceId);
  });

  await test.step('Owner ends call', async () => {
    await ownerPages.calling().clickLeaveCallButton();
  });
});
