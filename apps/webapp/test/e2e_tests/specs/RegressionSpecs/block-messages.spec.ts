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
import {addCreatedUser, removeCreatedUser} from 'test/e2e_tests/utils/tearDown.util';
import {createGroup, loginUser} from 'test/e2e_tests/utils/userActions';

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';

// Generating test data
// userB is the contact user, userA is the user who blocks
const userB = getUser();
const userA = getUser();

test('Block specs', {tag: ['@TC-141', '@regression']}, async ({pageManager: userAPageManager, api, browser}) => {
  const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;
  const userBContext = await browser.newContext();
  const userBPage = await userBContext.newPage();
  const userBPageManager = PageManager.from(userBPage);
  const {pages: userBPages, modals: userBModals, components: userBComponents} = userBPageManager.webapp;
  const conversationName = 'Conversation with Blocked';
  const messageText = 'second message';

  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createPersonalUser(userA);
    addCreatedUser(userA);

    await api.createPersonalUser(userB);
    addCreatedUser(userB);
  });

  await test.step('Users A and B are signed in to the application', async () => {
    await Promise.all([
      (async () => {
        await userAPageManager.openMainPage();
        await loginUser(userA, userAPageManager);
        await userAModals.dataShareConsent().clickDecline();
        await userAComponents.conversationSidebar().isPageLoaded();
      })(),

      (async () => {
        await userBPageManager.openMainPage();
        await loginUser(userB, userBPageManager);
        await userBModals.dataShareConsent().clickDecline();
        await userBComponents.conversationSidebar().isPageLoaded();
      })(),
    ]);

    await api.connectUsers(userA, userB);
  });

  await test.step('Preconditions: Users A and B are in a group', async () => {
    await userAComponents.conversationSidebar().isPageLoaded();
    await createGroup(userAPages, conversationName, [userB]);
  });

  // Test steps
  await test.step('User A blocks User B from group conversation', async () => {
    await userAPages.conversation().clickConversationTitle();
    await userAPages.conversationDetails().openParticipantDetails(userB.fullName);
    await userAPages.participantDetails().blockUser();
    await userAModals.blockWarning().clickBlock();
  });

  await test.step('User B sends messages to 1:1', async () => {
    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userBPages.conversation().sendMessage(messageText);
  });

  await test.step('User B sends messages to group', async () => {
    await userBPages.conversationList().openConversation(conversationName);
    await userBPages.conversation().sendMessage(messageText);
  });

  await test.step('User A does not see the 1:1 message', async () => {
    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await expect(userAPages.conversation().conversationTitle).toHaveText(userB.fullName, {timeout: 10_000});
    expect(await userAPages.conversation().messageCount()).toBe(0);
  });

  await test.step('User A does see the group message', async () => {
    await userAPages.conversationList().openConversation(conversationName);
    await expect(userAPages.conversation().conversationTitle).toHaveText(conversationName, {timeout: 10_000});

    // TODO: Bug [WPB-18226], remove these lines when fixed
    await userAPageManager.refreshPage({waitUntil: 'load'});
    await userAPages.conversationList().openConversation(conversationName);
    await expect(userAPages.conversation().conversationTitle).toHaveText(conversationName, {timeout: 10_000});

    expect(await userAPages.conversation().messageCount()).toBe(1);
  });
});

test.afterAll(async ({api}) => {
  await removeCreatedUser(api, userA);
  await removeCreatedUser(api, userB);
});
