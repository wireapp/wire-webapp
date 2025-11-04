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
import {test, expect} from 'test/e2e_tests/test.fixtures';
import {addCreatedUser} from 'test/e2e_tests/utils/tearDown.util';
import {loginUser} from 'test/e2e_tests/utils/userActions';

const userA = getUser();
const userB = getUser();

test.describe('Edit', () => {
  test(
    'I can edit my message in 1:1',
    {tag: ['@TC-679', '@regression']},
    async ({pageManager: userAPageManager, page: userAPage, browser, api}) => {
      test.slow();

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

        await api.connectUsers(userA, userB);
      });

      await test.step('Preconditions: Users A and B are signed in to the application', async () => {
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

      await test.step('User A sends message to user B', async () => {
        await userBPages.conversationList().openConversation(userA.fullName);
        await userAPages.conversationList().openConversation(userB.fullName);
        await userAPages.conversation().sendMessage('Test Message');

        const message = userAPages.conversation().messageItems.filter({hasText: userA.fullName});
        await expect(message).toContainText('Test Message');
      });

      await test.step('User A edits the previously sent message', async () => {
        const message = userAPages.conversation().messageItems.filter({hasText: userA.fullName});
        await userAPages.conversation().editMessage(message);
        await expect(userAPages.conversation().messageInput).toContainText('Test Message');

        await userAPages.conversation().sendMessage('Edited Message');
        await expect(message).toContainText('Edited Message');
      });

      await userAPage.waitForTimeout(3000);
    },
  );
});
