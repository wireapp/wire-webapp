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

import {getUser, User} from '../../data/user';
import {test, expect} from '../../test.fixtures';
import {addCreatedTeam, addCreatedUser, tearDownAll} from '../../utils/tearDownUtil';

test('Conversation Management', {tag: ['@TC-8636', '@crit-flow-web']}, async ({pages, api}) => {
  test.setTimeout(420000); // Set test timeout to 7 minutes

  // Generating test data
  const owner = getUser();
  const members = Array.from({length: 5}, () => getUser());

  const teamName = 'Conversation Management';
  const conversationName = 'Test Conversation';

  const inviteMembers = async () => {
    await Promise.all(
      members.map(async member => {
        const invitationId = await api.team.inviteUserToTeam(member.email, owner);
        const invitationCode = await api.brig.getTeamInvitationCodeForEmail(owner.teamId!, invitationId);
        await api.createPersonalUser(member, invitationCode);
        addCreatedUser(member);
      }),
    );
  };

  const loginUser = async (user: User) => {
    await pages.singleSignOnPage.isSSOPageVisible();
    await pages.singleSignOnPage.enterEmailOnSSOPage(user.email);
    await pages.loginPage.inputPassword(user.password);
    await pages.loginPage.clickSignInButton();
  };

  const logOutUser = async () => {
    await pages.conversationSidebar.clickPreferencesButton();
    await pages.settingsPage.clickLogoutButton();
    await pages.confirmLogoutModal.clickConfirm();
  };

  const sendMessage = async (conversation: string, message: string) => {
    await pages.conversationListPage.openConversation(conversation);
    await pages.conversationPage.sendMessage(message);
    expect(await pages.conversationPage.isMessageVisible(message)).toBeTruthy();
  };

  await test.step('Preconditions: Team owner created a team with 5 members', async () => {
    await api.createTeamOwner(owner, teamName);
    owner.teamId = await api.team.getTeamIdForUser(owner);
    addCreatedTeam(owner, owner.teamId);
    await inviteMembers();
  });

  await test.step('Team owner signed in to the application', async () => {
    await pages.openMainPage();
    await loginUser(owner);
  });

  await test.step('Team owner accepts the usage terms', async () => {
    await pages.dataShareConsentModal.clickConfirm();
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
    await sendMessage(conversationName, 'Hello team! Admin here.');
  });

  await test.step('Team owner logs out from the application', async () => {
    await logOutUser();
  });

  await test.step('Team members sign in, accept terms, send messages, and log out', async () => {
    for (const member of members) {
      await loginUser(member);
      if (await pages.dataShareConsentModal.isModalPresent()) {
        await pages.dataShareConsentModal.clickConfirm();
      }
      await sendMessage(conversationName, `Hello team! ${member.firstName} here.`);
      await logOutUser();
    }
  });

  await test.step('Team owner signed in to the application and verify messages', async () => {
    await loginUser(owner);
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
  await tearDownAll(api);
});
