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
import {ConfirmModal} from 'test/e2e_tests/pageManager/webapp/modals/confirm.modal';
import {test as baseTest, expect} from 'test/e2e_tests/test.fixtures';
import {getAudioFilePath, getTextFilePath, getVideoFilePath, shareAssetHelper} from 'test/e2e_tests/utils/asset.util';
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';
import {removeCreatedUser} from 'test/e2e_tests/utils/tearDown.util';
import {createGroup, loginUser} from 'test/e2e_tests/utils/userActions';

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

  test('I want to reply to a link', {tag: ['@TC-3005', '@regression']}, async ({browser, userA, userB}) => {
    const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});
    await pages.conversation().sendMessage('https://www.lidl.de/');

    const messageWithLink = pages.conversation().getMessage({sender: userA});
    await pages.conversation().replyToMessage(messageWithLink);
    await pages.conversation().sendMessage('Reply');

    const reply = pages.conversation().getMessage({content: 'Reply'});
    await expect(reply.getByTestId('quote-item').getByTestId('markdown-link')).toBeVisible();
  });

  test('I want to reply to a file', {tag: ['@TC-3006', '@regression']}, async ({browser, userA, userB}) => {
    const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});
    const {page} = pages.conversation();
    await shareAssetHelper(getTextFilePath(), page, page.getByRole('button', {name: 'Add file'}));

    const messageWithFile = pages.conversation().getMessage({sender: userA});
    await pages.conversation().replyToMessage(messageWithFile);
    await pages.conversation().sendMessage('Reply');

    const reply = pages.conversation().getMessage({content: 'Reply'});
    await expect(reply.getByTestId('quote-item').getByTestId('file-asset')).toBeVisible();
  });

  test('I want to reply to a reply', {tag: ['@TC-3007', '@regression']}, async ({browser, userA, userB}) => {
    const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});
    await pages.conversation().sendMessage('Message');

    const message = pages.conversation().getMessage({content: 'Message'});
    await pages.conversation().replyToMessage(message);
    await pages.conversation().sendMessage('Reply 1');

    const reply1 = pages.conversation().getMessage({content: 'Reply 1'});
    await pages.conversation().replyToMessage(reply1);
    await pages.conversation().sendMessage('Reply 2');

    const reply = pages.conversation().getMessage({content: 'Reply 2'});
    await expect(reply.getByTestId('quote-item')).toContainText('Reply 1');
  });

  test(
    'I want to reply to a link mixed with text',
    {tag: ['@TC-3008', '@regression']},
    async ({browser, userA, userB}) => {
      const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});
      await pages.conversation().sendMessage('Link: https://www.lidl.de/');

      const messageWithLink = pages.conversation().getMessage({sender: userA});
      await pages.conversation().replyToMessage(messageWithLink);
      await pages.conversation().sendMessage('Reply');

      const reply = pages.conversation().getMessage({content: 'Reply'});
      await expect(reply.getByTestId('quote-item')).toContainText('Link: https://www.lidl.de');
      await expect(reply.getByTestId('quote-item').getByTestId('markdown-link')).toBeVisible();
    },
  );

  test(
    'I want to send a timed message as a reply to any type of a message',
    {tag: ['@TC-3011', '@regression']},
    async ({browser, userA, userB}) => {
      const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});
      await pages.conversation().sendMessage('Message');

      const message = pages.conversation().getMessage({sender: userA});
      await pages.conversation().replyToMessage(message);
      await pages.conversation().sendTimedMessage('Timed Reply');

      const reply = pages.conversation().getMessage({content: 'Timed Reply'});
      await expect(reply.getByTestId('quote-item')).toContainText('Message');
    },
  );

  test(
    'I want to click the quoted message to jump to the original message',
    {tag: ['@TC-3013', '@regression']},
    async ({browser, userA, userB}) => {
      test.slow();

      const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});
      await pages.conversation().sendMessage('Message');
      await pages.conversation().sendMessage('Line\n'.repeat(50)); // Send a message with a lot of lines to test the scrolling behavior

      // .first() is needed as the reply quotes the original message, so we need to make sure the first one is used
      const message = pages.conversation().getMessage({content: 'Message', sender: userA}).first();
      await pages.conversation().replyToMessage(message);
      await pages.conversation().sendMessage('Reply');
      await expect(message).not.toBeInViewport();

      const reply = pages.conversation().getMessage({content: 'Reply'});
      await reply
        .getByTestId('quote-item')
        .getByRole('button', {name: /Original message from/})
        .click();

      // Validate the chat scrolled up, bringing the original message back into view
      await expect(message).toBeInViewport();
    },
  );

  test(
    'I should not be able to send a reply after I got removed from the conversation',
    {tag: ['@TC-3014', '@regression']},
    async ({browser, userA, userB}) => {
      const [userAPages, userBPages] = await Promise.all([
        createPagesForUser(browser, userA),
        createPagesForUser(browser, userB),
      ]);
      await createGroup(userAPages, 'Test Group', [userB]);

      await Promise.all([
        userAPages.conversationList().openConversation('Test Group'),
        userBPages.conversationList().openConversation('Test Group'),
      ]);

      await userAPages.conversation().sendMessage('Message');
      const message = userBPages.conversation().getMessage({content: 'Message', sender: userA});
      await expect(message).toBeVisible();

      await userAPages.conversation().clickConversationInfoButton();
      await userAPages.conversation().removeMemberFromGroup(userB.fullName);
      await new ConfirmModal(userAPages.conversation().page).clickAction();
      await expect(userBPages.conversation().getMessage({content: `${userA.fullName} removed you`})).toBeVisible();

      await message.hover();
      await expect(message.getByTestId('do-reply-message')).not.toBeAttached();
    },
  );

  test(
    'I want to reply with mention and tap on the mention in the reply opens the user profile',
    {tag: ['@TC-3016', '@regression']},
    async ({browser, userA, userB}) => {
      const pages = await createPagesForUser(browser, userA, {openConversationWith: userB});

      await pages.conversation().sendMessageWithUserMention(userB.fullName, 'Message');
      const message = pages.conversation().getMessage({content: 'Message'});

      await pages.conversation().replyToMessage(message);
      await pages.conversation().sendMessage('Reply');

      const reply = pages.conversation().getMessage({content: 'Reply'});

      await reply
        .getByTestId('quote-item')
        .getByRole('button', {name: `@${userB.fullName}`})
        // There seems to be a bug where clicking the "@" in front of the mention won't do anything, so we have to move the position a bit to the right to hit the name
        .click({position: {x: 16, y: 8}});

      await expect(pages.conversationDetails().conversationDetails).toBeVisible();
    },
  );
});
