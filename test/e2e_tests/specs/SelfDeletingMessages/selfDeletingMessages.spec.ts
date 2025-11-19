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
import {createGroup} from 'test/e2e_tests/utils/userActions';

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

      await userAPages.conversation().enableSelfDeletingMessages();
      await userAPages.conversation().sendMessage('Gone in 10s');
      await expect(userBPages.conversation().getMessage({content: 'Gone in 10s'})).toBeVisible();

      await userBPage.waitForTimeout(10_000); // Wait for 10s so the message is deleted
      await expect(userAPages.conversation().getMessage({content: 'Gone in 10s'})).not.toBeVisible();
      await expect(userBPages.conversation().getMessage({content: 'Gone in 10s'})).not.toBeVisible();
    },
  );

  test(
    'Verify sending ephemeral text message in group',
    {tag: ['@TC-658', '@regression']},
    async ({createPage, userA, userB}) => {
      const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await createGroup(userAPages, 'Test Group', [userB]);
      await userBPages.conversationList().openConversation('Test Group');

      await userAPages.conversation().enableSelfDeletingMessages();
      await userAPages.conversation().sendMessage('Gone in 10s');
      await expect(userBPages.conversation().getMessage({content: 'Gone in 10s'})).toBeVisible();

      await userBPage.waitForTimeout(10_000); // Wait for 10s so the message is deleted
      await expect(userAPages.conversation().getMessage({content: 'Gone in 10s'})).not.toBeVisible();
      await expect(userBPages.conversation().getMessage({content: 'Gone in 10s'})).not.toBeVisible();
    },
  );

  test(
    'Verify timer is applied to all messages until turning it off in 1:1',
    {tag: ['@TC-662', '@regression']},
    async ({createPage, userA, userB}) => {
      const page = await createPage(withLogin(userA), withConversation(userB));
      const pages = PageManager.from(page).webapp.pages;

      await pages.conversation().enableSelfDeletingMessages();
      await pages.conversation().sendMessage('First Message');
      await pages.conversation().sendMessage('Second Message');

      await pages.conversation().disableSelfDeletingMessages();
      await pages.conversation().sendMessage('Third Message');

      const firstMessage = pages.conversation().getMessage({content: 'First Message'});
      const secondMessage = pages.conversation().getMessage({content: 'Second Message'});
      const thirdMessage = pages.conversation().getMessage({content: 'Third Message'});
      await expect(firstMessage).toBeVisible();
      await expect(secondMessage).toBeVisible();
      await expect(thirdMessage).toBeVisible();

      await page.waitForTimeout(10_000);
      await expect(firstMessage).not.toBeVisible();
      await expect(secondMessage).not.toBeVisible();
      await expect(thirdMessage).toBeVisible(); // Third message should still be visible since the timer was turned off before sending it
    },
  );

  test(
    'Verify that message with previous timer are deleted on start-up when the timeout passed in 1:1',
    {tag: ['@TC-664', '@regression']},
    async ({createPage, userA, userB}) => {
      let page = await createPage(withLogin(userA), withConversation(userB));
      const ctx = page.context();
      let pages = PageManager.from(page).webapp.pages;

      await pages.conversation().enableSelfDeletingMessages();
      await pages.conversation().sendMessage('Test Message');
      await expect(pages.conversation().getMessage({sender: userA})).toBeVisible(); // Ensure message was sent before closing the page

      await page.close();
      await new Promise(res => setTimeout(res, 10_000)); // Wait 10s before logging in again to ensure the message has should be deleted by now

      // Re-open page reusing the same context so the login is not happening on a new device
      page = await ctx.newPage();
      pages = PageManager.from(page).webapp.pages;
      await withLogin(userA)(page);

      const selfDeletingMessage = pages.conversation().getMessage({sender: userA});
      await expect(selfDeletingMessage).toBeVisible();
      await expect(selfDeletingMessage).not.toContainText('Test Message');
    },
  );
});
