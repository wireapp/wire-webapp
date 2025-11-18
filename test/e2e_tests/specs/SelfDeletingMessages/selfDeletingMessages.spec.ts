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

import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test as baseTest, expect, withConversation, withLogin} from 'test/e2e_tests/test.fixtures';

const test = baseTest.extend<{userA: User; userB: User}>({
  userA: async ({createUser}, use) => use(await createUser()),
  userB: async ({createUser}, use) => use(await createUser()),
});

test.describe('Self Deleting Messages', () => {
  test.beforeEach(async ({api, userA, userB}) => {
    await api.connectUsers(userA, userB);
  });

  test(
    'Verify sending ephemeral text message in 1:1',
    {tag: ['@TC-657', '@regression']},
    async ({createPage, userA, userB}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConversation(userB)),
        createPage(withLogin(userB), withConversation(userA)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await userAPages.conversation().sendTimedMessage('Gone in 10s');
      await expect(userAPages.conversation().getMessage({content: 'Gone in 10s'})).toBeVisible();
      await expect(userBPages.conversation().getMessage({content: 'Gone in 10s'})).toBeVisible();

      await userBPage.waitForTimeout(10_000); // Wait for 10s so the message is deleted
      await expect(userAPages.conversation().getMessage({content: 'Gone in 10s'})).not.toBeVisible();
      await expect(userBPages.conversation().getMessage({content: 'Gone in 10s'})).not.toBeVisible();
    },
  );
});
