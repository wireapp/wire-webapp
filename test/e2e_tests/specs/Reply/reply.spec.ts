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
import {getAudioFilePath, getVideoFilePath, shareAssetHelper} from 'test/e2e_tests/utils/asset.util';
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';
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

  test(
    'I should not see the quoted message when searching for original message in collections',
    {tag: ['@TC-2996', '@regression']},
    async ({browser, userA, userB}) => {
      const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});
      await pages.conversation().sendMessage('Test');

      const messageToReplyTo = pages.conversation().getMessage({content: 'Test'});
      await pages.conversation().replyToMessage(messageToReplyTo);
      await pages.conversation().sendMessage('Reply');

      await pages.conversation().searchButton.click();
      await pages.collection().searchForMessages('Test');

      // Only the original message should be shown since the reply doesn't contain the search term
      await expect(pages.collection().searchItems).toHaveCount(1);
      await expect(pages.collection().searchItems).not.toContainText('Reply');
    },
  );

  test(
    'I want to see truncated quote preview if quote is too long',
    {tag: ['@TC-2997', '@regression']},
    async ({browser, userA, userB}) => {
      const longMessage =
        'This is a very long message which should be truncated within the UI since it is as already stated very long.';

      const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});
      await pages.conversation().sendMessage(longMessage);

      const messageToReplyTo = pages.conversation().getMessage({content: longMessage});
      await pages.conversation().replyToMessage(messageToReplyTo);
      await pages.conversation().sendMessage('Reply');

      // Since the text is truncated using CSS the only reliable way for testing it is truncated is to assert the existence of the show more button
      const quoteInReply = pages.conversation().getMessage({content: 'Reply'}).getByTestId('quote-item');
      await expect(quoteInReply.getByRole('button', {name: 'Show more'})).toBeVisible();
    },
  );

  test('I want to reply to a picture', {tag: ['@TC-3002', '@regression']}, async ({browser, userA, userB}) => {
    const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});
    const {page} = pages.conversation();
    await shareAssetHelper(getImageFilePath(), page, page.getByRole('button', {name: 'Add picture'}));

    const messageWithImage = pages.conversation().getMessage({sender: userA});
    await pages.conversation().replyToMessage(messageWithImage);
    await pages.conversation().sendMessage('Reply');

    const reply = pages.conversation().getMessage({content: 'Reply'});
    await expect(reply.getByTestId('quote-item').getByTestId('image-asset-img')).toBeVisible();
  });

  test('I want to reply to an audio message', {tag: ['@TC-3003', '@regression']}, async ({browser, userA, userB}) => {
    const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});
    const {page} = pages.conversation();
    await shareAssetHelper(getAudioFilePath(), page, page.getByRole('button', {name: 'Add file'}));

    const messageWithAudio = pages.conversation().getMessage({sender: userA});
    await pages.conversation().replyToMessage(messageWithAudio);
    await pages.conversation().sendMessage('Reply');

    const reply = pages.conversation().getMessage({content: 'Reply'});
    await expect(reply.getByTestId('quote-item').getByTestId('audio-asset')).toBeVisible();
  });

  test('I want to reply to a video message', {tag: ['@TC-3004', '@regression']}, async ({browser, userA, userB}) => {
    const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});
    const {page} = pages.conversation();
    await shareAssetHelper(getVideoFilePath(), page, page.getByRole('button', {name: 'Add file'}));

    const messageWithVideo = pages.conversation().getMessage({sender: userA});
    await pages.conversation().replyToMessage(messageWithVideo);
    await pages.conversation().sendMessage('Reply');

    const reply = pages.conversation().getMessage({content: 'Reply'});
    await expect(reply.getByTestId('quote-item').getByTestId('video-asset')).toBeVisible();
  });
});
