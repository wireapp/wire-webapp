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
const userA = getUser();
const userB = getUser();

test(
  'Scroll to highlighted message',
  {tag: ['@regression']},
  async ({pageManager: userAPageManager, api, browser, page: userAPage}) => {
    test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

    const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();
    const userBPageManager = PageManager.from(userBPage);
    const {pages: userBPages, modals: userBModals} = userBPageManager.webapp;

    const messages = [
      'First message in conversation',
      'Second message',
      'Third message',
      'Fourth message',
      'Fifth message',
      'Message to be highlighted',
      'Seventh message',
      'Eighth message',
      'Ninth message',
      'Tenth message',
    ];

    await test.step('Preconditions: Creating users via API', async () => {
      await api.createPersonalUser(userA);
      addCreatedUser(userA);

      await api.createPersonalUser(userB);
      addCreatedUser(userB);

      await api.connectUsers(userA, userB);
    });

    await test.step('Users A and B are signed in to the application', async () => {
      await Promise.all([
        (async () => {
          await userAPageManager.openMainPage();
          await loginUser(userA, userAPageManager);
          await userAModals.dataShareConsent().clickDecline();
        })(),

        (async () => {
          await userBPageManager.openMainPage();
          await loginUser(userB, userBPageManager);
          await userBModals.dataShareConsent().clickDecline();
        })(),
      ]);
    });

    await test.step('User A sends multiple messages to create a scrollable conversation', async () => {
      await userAPages.conversationList().openConversation(userB.fullName);

      // Send messages to create a long conversation
      for (const message of messages) {
        await userAPages.conversation().sendMessage(message);
      }
    });

    await test.step('User B receives the messages', async () => {
      await userBPages.conversationList().openConversation(userA.fullName);

      // Verify the last message is visible
      expect(await userBPages.conversation().isMessageVisible(messages[messages.length - 1])).toBeTruthy();
    });

    await test.step('User B clicks on message timestamp to highlight and scroll to a specific message', async () => {
      // Get the message to be highlighted (6th message in the list)
      const messageToHighlight = messages[5]; // "Message to be highlighted"
      const messageLocator = userBPage.locator(`[data-uie-name="item-message"]`, {
        has: userBPage.locator('.text', {hasText: messageToHighlight}),
      });

      // Click on the message timestamp
      const timestampLocator = messageLocator.locator('[data-uie-name="message-timestamp"]');
      await timestampLocator.click();

      // Wait for scroll animation (100ms initial timeout + time for scroll)
      await userBPage.waitForTimeout(200);

      // Verify the message is now visible and highlighted
      const highlightedMessage = userBPage.locator('[data-uie-name="item-message"].message-highlighted', {
        has: userBPage.locator('.text', {hasText: messageToHighlight}),
      });

      expect(await highlightedMessage.isVisible()).toBeTruthy();
    });

    await test.step('Highlighted state is removed after animation completes', async () => {
      const messageToHighlight = messages[5];

      // Wait for the highlight to be cleared (1000ms timeout)
      await userBPage.waitForTimeout(1100);

      // Verify the message is no longer highlighted
      const highlightedMessage = userBPage.locator('[data-uie-name="item-message"].message-highlighted', {
        has: userBPage.locator('.text', {hasText: messageToHighlight}),
      });

      expect(await highlightedMessage.count()).toBe(0);
    });

    await test.step('Scroll to different message via timestamp click', async () => {
      // Scroll to bottom first
      await userBPages.conversation().sendMessage('New bottom message');
      await userBPage.waitForTimeout(500);

      // Click on a different message timestamp (3rd message)
      const messageToHighlight = messages[2]; // "Third message"
      const messageLocator = userBPage.locator(`[data-uie-name="item-message"]`, {
        has: userBPage.locator('.text', {hasText: messageToHighlight}),
      });

      const timestampLocator = messageLocator.locator('[data-uie-name="message-timestamp"]');
      await timestampLocator.click();

      // Wait for scroll animation
      await userBPage.waitForTimeout(200);

      // Verify the message is now visible and highlighted
      const highlightedMessage = userBPage.locator('[data-uie-name="item-message"].message-highlighted', {
        has: userBPage.locator('.text', {hasText: messageToHighlight}),
      });

      expect(await highlightedMessage.isVisible()).toBeTruthy();
    });

    await test.step('User A can also scroll to highlighted message', async () => {
      // Scroll to bottom
      const lastMessage = 'A new message from A';
      await userAPages.conversation().sendMessage(lastMessage);
      await userAPage.waitForTimeout(500);

      // Click on timestamp of earlier message
      const messageToHighlight = messages[4]; // "Fifth message"
      const messageLocator = userAPage.locator(`[data-uie-name="item-message"]`, {
        has: userAPage.locator('.text', {hasText: messageToHighlight}),
      });

      const timestampLocator = messageLocator.locator('[data-uie-name="message-timestamp"]');
      await timestampLocator.click();

      // Wait for scroll animation
      await userAPage.waitForTimeout(200);

      // Verify the message is highlighted
      const highlightedMessage = userAPage.locator('[data-uie-name="item-message"].message-highlighted', {
        has: userAPage.locator('.text', {hasText: messageToHighlight}),
      });

      expect(await highlightedMessage.isVisible()).toBeTruthy();
    });

    await userBContext.close();
  },
);

test.afterAll(async ({api}) => {
  await removeCreatedUser(api, userA);
  await removeCreatedUser(api, userB);
});
