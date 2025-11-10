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
import {loginUser} from 'test/e2e_tests/utils/userActions';

const test = baseTest.extend<{userA: User; userB: User}>({
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
});

const createPagesForUser = async (browser: Browser, user: User, options?: {openConversationWith?: User}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageManager = PageManager.from(page);

  await pageManager.openMainPage();
  await loginUser(user, pageManager);
  const {pages, modals} = pageManager.webapp;

  await modals.dataShareConsent().clickDecline();

  if (options?.openConversationWith) {
    await pages.conversationList().openConversation(options.openConversationWith.fullName);
  }

  return pages;
};

test.describe('Reply', () => {
  test.beforeEach(async ({api, userA, userB}) => {
    await api.connectUsers(userA, userB);
  });

  test(
    'I should not be able to reply to a ping',
    {tag: ['@TC-8038', '@regression']},
    async ({browser, userA, userB}) => {
      const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});

      await pages.conversation().sendPing();

      const ping = pages.conversation().systemMessages.last();
      await expect(pages.conversation().systemMessages.last()).toContainText('pinged');

      await pages.conversation().systemMessages.last().hover();
      await expect(ping.getByTestId('do-reply-message')).not.toBeAttached();
    },
  );

  test(
    'I should not be able to reply to timed messages',
    {tag: ['@TC-8039', '@regression']},
    async ({browser, userA, userB}) => {
      const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});

      await pages.conversation().sendTimedMessage('Gone in 10s');
      const message = pages.conversation().getMessage({content: 'Gone in 10s'});
      await message.hover();

      await expect(message.getByTestId('do-reply-message')).not.toBeAttached();
    },
  );

  test(
    'I want to see a placeholder text as quote when original message is not available anymore',
    {tag: ['@TC-2994', '@regression']},
    async ({browser, userA, userB}) => {
      test.slow();

      const [userAPages, userBPages] = await Promise.all([
        createPagesForUser(browser, userA, {openConversationWith: userB}),
        createPagesForUser(browser, userB, {openConversationWith: userA}),
      ]);

      await userAPages.conversation().sendMessage('Test');

      const messageToReplyTo = userBPages.conversation().getMessage({content: 'Test'});
      await userBPages.conversation().replyToMessage(messageToReplyTo);
      await userBPages.conversation().sendMessage('Reply');

      const replyMessage = userBPages.conversation().getMessage({content: 'Reply'});
      await expect(replyMessage.getByTestId('quote-item')).toContainText('Test');

      const messageToDelete = userAPages.conversation().getMessage({content: 'Test', sender: userA});
      await userAPages.conversation().deleteMessage(messageToDelete, 'Everyone');

      await expect(replyMessage.getByTestId('quote-item')).toContainText('You cannot see this message');
    },
  );
});
