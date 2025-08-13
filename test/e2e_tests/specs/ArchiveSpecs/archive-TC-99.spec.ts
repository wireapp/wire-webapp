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
  'Archived Conversation should not unarchive with messages',
  {tag: ['@TC-99', '@regression', '@torun']},
  async ({pageManager: ownerAPageManager, api, browser}) => {
    const {pages: ownerAPages, modals: ownerAModals, components: ownerAComponents} = ownerAPageManager.webapp;
    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();
    const userBPageManager = PageManager.from(userBPage);
    const {pages: userBPages, modals: userBModals, components: userBComponents} = userBPageManager.webapp;

    await test.step('Preconditions: Users A and B exist', async () => {
      const user = await api.createTeamOwner(ownerA, teamName);
      ownerA = {...ownerA, ...user};
      addCreatedTeam(ownerA, ownerA.teamId);
      await inviteMembers([userB], ownerA, api);
    });

    await test.step('Users A and B are signed in to the application', async () => {
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
      await userBPages.startUI().selectUser(ownerA.username);
      expect(await userBModals.userProfile().isVisible());
      await userBModals.userProfile().clickStartConversation();
    });

    await test.step('Users A has archives conversation with User B', async () => {
      await ownerAPages.conversationList().openContextMenu(userB.fullName);
      await ownerAPages.conversationList().archiveConversation();
      await ownerAComponents.conversationSidebar().clickArchive();
      await ownerAPages.conversationList().isConversationItemVisible(userB.fullName);
    });

    await test.step('User B sends messages to the conversations', async () => {
      //TBD
    });

    await test.step('User A should still see conversation archived', async () => {
      //TBD
    });
  },
);

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, ownerA);
});
