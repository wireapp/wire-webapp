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

import {Browser} from '@playwright/test';

import {getUser, User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test as baseTest, expect} from 'test/e2e_tests/test.fixtures';
import {removeCreatedUser} from 'test/e2e_tests/utils/tearDown.util';
import {createGroup, loginUser} from 'test/e2e_tests/utils/userActions';

const test = baseTest.extend<{userA: User; userB: User; setup: void}>({
  userA: async ({api}, use) => {
    const userA = getUser();
    await api.createPersonalUser(userA);
    await use(userA);
    await removeCreatedUser(api, userA);
  },
  userB: async ({api}, use) => {
    const userB = getUser();
    await api.createPersonalUser(userB);
    await use(userB);
    await removeCreatedUser(api, userB);
  },
  setup: [
    async ({api, userA, userB}, use) => {
      await api.connectUsers(userA, userB);
      await use();
    },
    {auto: true},
  ],
});

const createPagesForUser = async (browser: Browser, user: User) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageManager = PageManager.from(page);
  const {pages, modals, components} = pageManager.webapp;

  await pageManager.openMainPage();
  await loginUser(user, pageManager);
  await modals.dataShareConsent().clickDecline();
  await components.conversationSidebar().isPageLoaded();

  return pages;
};

test.describe('Edit', () => {
  test('I can edit my message in 1:1', {tag: ['@TC-679', '@regression']}, async ({browser, userA, userB}) => {
    const userAPages = await createPagesForUser(browser, userA);
    await userAPages.conversationList().openConversation(userB.fullName);
    await userAPages.conversation().sendMessage('Test Message');

    const message = userAPages.conversation().messageItems.filter({hasText: userA.fullName});
    await expect(message).toContainText('Test Message');

    await userAPages.conversation().editMessage(message);
    await expect(userAPages.conversation().messageInput).toContainText('Test Message');

    // Overwrite the text in the message input and send it
    await userAPages.conversation().sendMessage('Edited Message');
    await expect(message).toContainText('Edited Message');
  });

  test(
    'I can edit my message in a group conversation',
    {tag: ['@TC-680', '@regression']},
    async ({browser, userA, userB}) => {
      const userAPages = await createPagesForUser(browser, userA);
      await createGroup(userAPages, 'Test Group', [userB]);
      await userAPages.conversationList().openConversation('Test Group');
      await userAPages.conversation().sendMessage('Test Message');

      const message = userAPages.conversation().messageItems.filter({hasText: userA.fullName});
      await expect(message).toContainText('Test Message');

      await userAPages.conversation().editMessage(message);
      await expect(userAPages.conversation().messageInput).toContainText('Test Message');

      // Overwrite the text in the message input and send it
      await userAPages.conversation().sendMessage('Edited Message');
      await expect(message).toContainText('Edited Message');
    },
  );
});
