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
import {completeLogin} from 'test/e2e_tests/utils/setup.util';
import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDown.util';
import {inviteMembers, sendTextMessageToConversation} from 'test/e2e_tests/utils/userActions';

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';

// Generating test data
let owner = getUser();
const member = getUser();

const teamName = 'Channels Management';
const conversation1 = 'Test Channel 1';
const conversation2 = 'Test Channel 2';
let memberPages: PageManager;

test('Channels Management', {tag: ['@TC-8752', '@crit-flow-web']}, async ({pageManager, api, browser}) => {
  const {pages, modals} = pageManager.webapp;

  test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

  await test.step('Preconditions: Team owner create a channels enabled team', async () => {
    const user = await api.createTeamOwner(owner, teamName);
    owner = {...owner, ...user};
    addCreatedTeam(owner, owner.teamId);
    await inviteMembers([member], owner, api);

    // TODO: Remove below line when we have a SQS workaround
    await api.brig.enableMLSFeature(owner.teamId);
    await api.brig.unlockChannelFeature(owner.teamId);
    await api.brig.enableChannelsFeature(owner.teamId);
    await pageManager.waitForTimeout(3000);
    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    memberPages = new PageManager(memberPage);
  });

  await test.step('Owner and member login', async () => {
    await Promise.all([completeLogin(pageManager, owner), completeLogin(memberPages, member)]);
  });

  await test.step('Team owner creates a channel with available member', async () => {
    await pages.conversationList().clickCreateGroup();
    await pages.groupCreation().setGroupName(conversation1);
    await pages.groupCreation().clickNextButton();
    await pages.startUI().selectUsers([member.username]);
    await pages.groupCreation().clickCreateGroupButton();
    await pages.groupCreation().waitForModalClose();
    expect(await pages.conversationList().isConversationItemVisible(conversation1)).toBeTruthy();
  });

  await test.step('Team members leave the conversation', async () => {
    await sendTextMessageToConversation(
      memberPages,
      conversation1,
      `Hello ${conversation1}, ${member.firstName} here!`,
    );
    await memberPages.webapp.pages.conversation().toggleGroupInformation();
    expect(await memberPages.webapp.pages.conversation().isUserGroupMember(member.fullName)).toBeTruthy();
    await memberPages.webapp.pages.conversation().leaveConversation();
    await memberPages.webapp.modals.leaveConversation().clickConfirm();
    await memberPages.webapp.pages.conversation().isConversationReadonly();
  });

  await test.step('Team owner confirm member left', async () => {
    await pages.conversationList().openConversation(conversation1);
    expect(await pages.conversation().isSystemMessageVisible(`${member.fullName} left`)).toBeTruthy();
  });

  await test.step('Team owner creates another channel', async () => {
    await pages.conversationList().clickCreateGroup();
    await pages.groupCreation().setGroupName(conversation2);
    await pages.groupCreation().clickNextButton();
    await pages.startUI().selectUsers([member.username]);
    await pages.groupCreation().clickCreateGroupButton();
    await pages.groupCreation().waitForModalClose();
    expect(await pages.conversationList().isConversationItemVisible(conversation2)).toBeTruthy();
  });

  await test.step('Team owner makes the member an admin', async () => {
    await pages.conversation().toggleGroupInformation();
    await pages.conversation().makeUserAdmin(member.fullName);
    await pages.conversation().toggleGroupInformation();
  });

  await test.step('Team member confirms admin status', async () => {
    await memberPages.webapp.pages.conversationList().openConversation(conversation2);
    await memberPages.webapp.pages.conversation().toggleGroupInformation();
    expect(await memberPages.webapp.pages.conversation().isUserGroupAdmin(member.fullName)).toBeTruthy();
  });

  await test.step('Team admin remove member', async () => {
    await pages.conversation().removeAdminFromGroup(member.fullName);
    await modals.removeMember().clickConfirm();
    await pages.conversation().toggleGroupInformation();
  });

  await test.step('Team member verifies they have been removed by the owner', async () => {
    await memberPages.webapp.pages.conversationList().openConversation(conversation2);
    await memberPages.webapp.pages.conversation().isConversationReadonly();
  });

  await test.step('Team owner add member back to the same conversation', async () => {
    await pages.conversationList().openConversation(conversation2);
    await pages.conversation().toggleGroupInformation();
    await pages.conversationDetails().waitForSidebar();
    await pages.conversationDetails().clickAddPeopleButton();
    await pages.startUI().selectUsers([member.username]);
    await pages.groupCreation().clickAddMembers();
  });

  await test.step('Team member confirms they have been added back to the conversation', async () => {
    await memberPages.webapp.pages.conversationList().openConversation(conversation2);
    await memberPages.webapp.pages.conversation().toggleGroupInformation();
    expect(
      memberPages.webapp.pages.conversation().isSystemMessageVisible(`${owner.fullName} added you to the conversation`),
    ).toBeTruthy();
  });

  await test.step('Team owner promote member to admin', async () => {
    await pages.conversationList().openConversation(conversation2);
    await pages.conversation().makeUserAdmin(member.fullName);
  });

  await test.step('Team member confirms admin status', async () => {
    await memberPages.webapp.pages.conversationList().openConversation(conversation2);
    await memberPages.webapp.pages.conversation().toggleGroupInformation();
    expect(await memberPages.webapp.pages.conversation().isUserGroupAdmin(member.fullName)).toBeTruthy();
  });

  await test.step('Team owner send a message', async () => {
    await sendTextMessageToConversation(pageManager, conversation2, 'Hello team! Admin here.');
  });

  await test.step('Team member sees the message', async () => {
    expect(await memberPages.webapp.pages.conversation().isMessageVisible('Hello team! Admin here.')).toBeTruthy();
  });
});

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, owner);
});
