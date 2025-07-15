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

import {inviteMembers, loginUser, logOutUser, sendTextMessageToConversation} from 'test/e2e_tests/utils/userActions';

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';
import {addCreatedTeam, removeCreatedTeam} from '../../utils/tearDownUtil';

// Generating test data
const owner = getUser();
const members = Array.from({length: 2}, () => getUser());
const teamName = 'Conversation Management';
const conversationName = 'Test Conversation';

test('Conversation Management', {tag: ['@TC-8636', '@crit-flow-web']}, async ({pages, api}) => {
  test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

  await test.step('Preconditions: Team owner created a team with 5 members', async () => {
    await api.createTeamOwner(owner, teamName);
    owner.teamId = await api.team.getTeamIdForUser(owner);
    addCreatedTeam(owner, owner.teamId);
    await inviteMembers(members, owner, api);
  });

  await test.step('Team owner signed in to the application', async () => {
    await pages.openMainPage();
    await loginUser(owner, pages);
    await pages.dataShareConsentModal.clickDecline();
  });

  await test.step('Team owner creates a group with all the five members', async () => {
    await pages.conversationListPage.clickCreateGroup();
    await pages.groupCreationPage.setGroupName(conversationName);
    await pages.startUIPage.selectUsers(members.map(member => member.username));
    await pages.groupCreationPage.clickCreateGroupButton();
    expect(await pages.conversationListPage.isConversationItemVisible(conversationName)).toBeTruthy();
    // TODO: Bug [WPB-18226], remove this when fixed
    await pages.refreshPage({waitUntil: 'load'});
  });

  await test.step('Team owner sends a message in the conversation', async () => {
    await sendTextMessageToConversation(pages, conversationName, 'Hello team! Admin here.');
  });

  await test.step('Team owner logs out from the application', async () => {
    await logOutUser(pages);
  });

  await test.step('Team members sign in, send messages, and log out', async () => {
    for (const member of members) {
      await loginUser(member, pages);
      await pages.dataShareConsentModal.clickDecline();
      await sendTextMessageToConversation(pages, conversationName, `Hello team! ${member.firstName} here.`);
      await logOutUser(pages);
    }
  });

  await test.step('Team owner signed in to the application and verify messages', async () => {
    await loginUser(owner, pages);
    await pages.conversationListPage.openConversation(conversationName);
    for (const member of members) {
      expect(await pages.conversationPage.isMessageVisible(`Hello team! ${member.firstName} here.`)).toBeTruthy();
    }
  });

  await test.step('Team owner send self-destructing messages', async () => {
    await pages.conversationPage.enableAutoDeleteMessages();
    await pages.conversationPage.sendMessage('This message will self-destruct in 10 seconds.');
    expect(
      await pages.conversationPage.isMessageVisible('This message will self-destruct in 10 seconds.'),
    ).toBeTruthy();
    // Wait for more than 10 seconds to ensure the message is deleted
    await pages.conversationPage.page.waitForTimeout(11000);
    expect(await pages.conversationPage.isMessageVisible('This message will self-destruct in 10 seconds.')).toBeFalsy();
  });

  await test.step('Team owner open searched conversation', async () => {
    await pages.conversationListPage.searchConversation(conversationName);
    await pages.conversationListPage.openConversation(conversationName);
    expect(await pages.conversationListPage.isConversationItemVisible(conversationName)).toBeTruthy();
    await pages.conversationListPage.openConversation(conversationName);
  });

  await test.step('Team owner leave conversation with clear history', async () => {
    await pages.conversationListPage.openContextMenu(conversationName);
    await pages.conversationListPage.leaveConversation();
    await pages.leaveConversationModal.toggleCheckbox();
    await pages.leaveConversationModal.clickConfirm();
    await pages.conversationPage.isConversationReadonly();
    expect(await pages.conversationPage.isMessageInputVisible()).toBeFalsy();
  });
});

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, owner);
});
