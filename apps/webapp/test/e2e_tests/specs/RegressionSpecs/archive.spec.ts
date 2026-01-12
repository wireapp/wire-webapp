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
import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDown.util';
import {inviteMembers, loginUser} from 'test/e2e_tests/utils/userActions';

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';

// Generating test data
let ownerA = getUser();
const userB = getUser();
const teamName = 'Archive Conversation';

test(
  'Archive status of conversation should only change by user explicitly changing it',
  {tag: ['@TC-97', '@TC-99', '@TC-104', '@TC-105', '@regression']},
  async ({pageManager: ownerAPageManager, api, browser}) => {
    const {pages: ownerAPages, modals: ownerAModals, components: ownerAComponents} = ownerAPageManager.webapp;
    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();
    const userBPageManager = PageManager.from(userBPage);
    const {pages: userBPages, modals: userBModals, components: userBComponents} = userBPageManager.webapp;

    const conversationName = 'Our Group Conversation';

    await test.step('Preconditions: Users A and B exist', async () => {
      const user = await api.createTeamOwner(ownerA, teamName);
      ownerA = {...ownerA, ...user};
      addCreatedTeam(ownerA, ownerA.teamId);
      await inviteMembers([userB], ownerA, api);
    });

    await test.step('Preconditions: Users A and B are signed in to the application', async () => {
      await Promise.all([
        (async () => {
          await ownerAPageManager.openMainPage();
          await loginUser(ownerA, ownerAPageManager);
          await ownerAModals.dataShareConsent().clickDecline();
        })(),

        (async () => {
          await userBPageManager.openMainPage();
          await loginUser(userB, userBPageManager);
          await userBModals.dataShareConsent().clickDecline();
        })(),
      ]);
    });

    await test.step('Preconditions: Users have a 1:1', async () => {
      await userBComponents.conversationSidebar().clickConnectButton();
      await userBPages.startUI().selectUsers(ownerA.username);
      expect(await userBModals.userProfile().isVisible());
      await userBModals.userProfile().clickStartConversation();
    });

    await test.step('Preconditions: Users have a group conversation', async () => {
      await userBPages.conversationList().clickCreateGroup();
      await userBPages.groupCreation().setGroupName(conversationName);
      await userBPages.startUI().selectUsers(ownerA.username);
      await userBPages.groupCreation().clickCreateGroupButton();
    });

    await test.step('Users A has archives conversations with User B', async () => {
      await ownerAPages.conversationList().openContextMenu(userB.fullName);
      await ownerAPages.conversationList().archiveConversation();

      await ownerAPages.conversationList().openContextMenu(conversationName);
      await ownerAPages.conversationList().archiveConversation();

      await ownerAComponents.conversationSidebar().clickArchive();
      await ownerAPages.conversationList().isConversationItemVisible(userB.fullName);
      await ownerAPages.conversationList().isConversationItemVisible(conversationName);
    });

    await test.step('User B sends message, ping, and call to the 1:1 conversation', async () => {
      await userBPages.conversationList().openConversation(ownerA.fullName);
      await userBPages.conversation().sendMessage('Anything');
      await userBPages.conversation().sendPing();
      await userBPages.conversation().clickCallButton();
    });

    await test.step('User B sends message and ping to the group conversation', async () => {
      await userBPages.conversationList().openConversation(conversationName);
      await userBPages.conversation().sendMessage('Anything');
      await userBPages.conversation().sendPing();
    });

    await test.step('User A should still see conversation archived', async () => {
      await ownerAPages.conversationList().isConversationItemVisible(userB.fullName);
    });

    await test.step('User A unarchives conversation', async () => {
      await ownerAPages.conversationList().openContextMenu(userB.fullName);
      await ownerAPages.conversationList().unarchiveConversation();

      await ownerAPages.conversationList().openContextMenu(conversationName);
      await ownerAPages.conversationList().unarchiveConversation();
    });

    await test.step('User A should see conversation in the regular list', async () => {
      await ownerAComponents.conversationSidebar().clickAllConversationsButton();
      await ownerAPages.conversationList().isConversationItemVisible(userB.fullName);
      await ownerAPages.conversationList().isConversationItemVisible(conversationName);
    });
  },
);

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, ownerA);
});
