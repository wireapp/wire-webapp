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
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';

// Generating test data
// userB is the contact user, userA is the user who blocks
const userB = getUser();
const userA = getUser();

test('Block specs', {tag: ['@TC-141', '@regression']}, async ({pageManager: userAPageManager, api, browser}) => {
  test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

  const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;
  const userBContext = await browser.newContext();
  const userBPage = await userBContext.newPage();
  const userBPageManager = PageManager.from(userBPage);
  const {pages: userBPages, modals: userBModals, components: userBComponents} = userBPageManager.webapp;

  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createPersonalUser(userA);
    addCreatedUser(userA);

    await api.createPersonalUser(userB);
    addCreatedUser(userB);
  });

  await test.step('Precondition: Users A and B are signed in to the application', async () => {
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
  });

  // Test steps
  await test.step('User B sends User A a connection request', async () => {
    await userBComponents.conversationSidebar().clickConnectButton();
    await userBPages.startUI().selectUser(userA.username);
    expect(await userBModals.userProfile().isVisible());
    await userBModals.userProfile().clickConnectButton();
  });

  await test.step('User A blocks User B from connection request', async () => {
    await userAPages.conversationList().clickBlockConversation();
    await userAModals.blockWarning().clickBlock();
  });
});

test.afterAll(async ({api}) => {
  await removeCreatedUser(api, userA);
  await removeCreatedUser(api, userB);
});
