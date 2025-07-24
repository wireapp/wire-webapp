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

import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDown.util';
import {inviteMembers, loginUser, logOutUser, sendTextMessageToConversation} from 'test/e2e_tests/utils/userActions';

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';

// Generating test data
const owner = getUser();
const members = Array.from({length: 2}, () => getUser());
const teamName = 'Conversation Management';
const conversationName = 'Test Conversation';

test('Conversation Management', {tag: ['@TC-8636', '@crit-flow-web']}, async ({pageManager, api}) => {
  const {pages, modals} = pageManager.webapp;
  test.setTimeout(120000); // Set test timeout to 5 minutes

  await test.step('Preconditions: Team owner created a team with 5 members', async () => {
    await api.createTeamOwner(owner, teamName);
    owner.teamId = await api.team.getTeamIdForUser(owner);
    addCreatedTeam(owner, owner.teamId);
    await inviteMembers(members, owner, api);
  });

  await test.step('Team owner signed in to the application', async () => {
    await pageManager.openMainPage();
    await loginUser(owner, pageManager);
    await modals.dataShareConsent().clickDecline();
  });

  await test.step('Team owner creates a group with all the five members', async () => {
    await pages.conversationList().clickCreateGroup();
    await pages.groupCreation().setGroupName(conversationName);
    await pages.startUI().selectUsers(members.map(member => member.username));
    await pages.groupCreation().clickCreateGroupButton();
    expect(await pages.conversationList().isConversationItemVisible(conversationName)).toBeTruthy();
    // TODO: Bug [WPB-18226], remove this when fixed
    await pageManager.refreshPage({waitUntil: 'load'});
  });

  await test.step('Team owner sends a message in the conversation', async () => {
    await sendTextMessageToConversation(pageManager, conversationName, 'Hello team! Admin here.');
  });

  await test.step('Team owner logs out from the application', async () => {
    await logOutUser(pageManager);
  });

  await test.step('Team members sign in, send messages, and log out', async () => {
    for (const member of members) {
      await loginUser(member, pageManager);
      await modals.dataShareConsent().clickDecline();
      await sendTextMessageToConversation(pageManager, conversationName, `Hello team! ${member.firstName} here.`);
      await logOutUser(pageManager);
    }
  });

  await test.step('Team owner signed in to the application and verify messages', async () => {
    await loginUser(owner, pageManager);
    await pages.conversationList().openConversation(conversationName);
    for (const member of members) {
      expect(await pages.conversation().isMessageVisible(`Hello team! ${member.firstName} here.`)).toBeTruthy();
    }
  });

  await test.step('Team owner send self-destructing messages', async () => {
    await pages.conversation().enableAutoDeleteMessages();
    await pages.conversation().sendMessage('This message will self-destruct in 10 seconds.');
    expect(await pages.conversation().isMessageVisible('This message will self-destruct in 10 seconds.')).toBeTruthy();
    // Wait for more than 10 seconds to ensure the message is deleted
    await pages.conversation().page.waitForTimeout(11000);
    expect(await pages.conversation().isMessageVisible('This message will self-destruct in 10 seconds.')).toBeFalsy();
  });

  await test.step('Team owner open searched conversation', async () => {
    await pages.conversationList().searchConversation(conversationName);
    await pages.conversationList().openConversation(conversationName);
    expect(await pages.conversationList().isConversationItemVisible(conversationName)).toBeTruthy();
    await pages.conversationList().openConversation(conversationName);
  });

  await test.step('Team owner leave conversation with clear history', async () => {
    await pages.conversationList().openContextMenu(conversationName);
    await pages.conversationList().leaveConversation();
    await modals.leaveConversation().toggleCheckbox();
    await modals.leaveConversation().clickConfirm();
    await pages.conversation().isConversationReadonly();
    expect(await pages.conversation().isMessageInputVisible()).toBeFalsy();
  });
});

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, owner);
});
