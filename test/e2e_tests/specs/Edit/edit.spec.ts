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

const createPagesForUser = async (browser: Browser, user: User) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageManager = PageManager.from(page);

  await pageManager.openMainPage();
  await loginUser(user, pageManager);

  return pageManager.webapp;
};

test.describe('Edit', () => {
  test.beforeEach(async ({api, userA, userB}) => {
    await api.connectUsers(userA, userB);
  });

  test('I can edit my message in 1:1', {tag: ['@TC-679', '@regression']}, async ({browser, userA, userB}) => {
    const {pages: userAPages, modals} = await createPagesForUser(browser, userA);
    await modals.dataShareConsent().clickDecline();
    await userAPages.conversationList().openConversation(userB.fullName);
    await userAPages.conversation().sendMessage('Test Message');

    const message = userAPages.conversation().getMessageFromUser(userA);
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
      const {pages: userAPages, modals} = await createPagesForUser(browser, userA);
      await modals.dataShareConsent().clickDecline();
      await createGroup(userAPages, 'Test Group', [userB]);
      await userAPages.conversationList().openConversation('Test Group');
      await userAPages.conversation().sendMessage('Test Message');

      const message = userAPages.conversation().getMessageFromUser(userA);
      await expect(message).toContainText('Test Message');

      await userAPages.conversation().editMessage(message);
      await expect(userAPages.conversation().messageInput).toContainText('Test Message');

      // Overwrite the text in the message input and send it
      await userAPages.conversation().sendMessage('Edited Message');
      await expect(message).toContainText('Edited Message');
    },
  );

  test(
    'I see changed message if message was edited from another device',
    {tag: ['@TC-682', '@regression']},
    async ({browser, userA, userB}) => {
      const {pages: device1, modals: device1Modals} = await createPagesForUser(browser, userA);
      await device1Modals.dataShareConsent().clickDecline();
      await device1.conversationList().openConversation(userB.fullName);

      // Device 2 is intentionally created after device 1 to ensure the history info warning is confirmed
      const {pages: device2} = await createPagesForUser(browser, userA);
      await device2.historyInfo().clickConfirmButton();
      await device2.conversationList().openConversation(userB.fullName);

      await device1.conversation().sendMessage('Message from device 1');

      const messageOnDevice1 = device1.conversation().getMessageFromUser(userA);
      const messageOnDevice2 = device2.conversation().getMessageFromUser(userA);
      await expect(messageOnDevice1).toContainText('Message from device 1');
      await expect(messageOnDevice2).toContainText('Message from device 1');

      await device1.conversation().editMessage(messageOnDevice1);
      await device1.conversation().sendMessage('Updated message from device 1');

      await expect(messageOnDevice1).toContainText('Updated message from device 1');
      await expect(messageOnDevice2).toContainText('Updated message from device 1');
    },
  );

  test('I cannot edit another users message', {tag: ['@TC-683', '@regression']}, async ({browser, userA, userB}) => {
    const [userAPages, userBPages] = await Promise.all([
      (async () => {
        const {pages, modals} = await createPagesForUser(browser, userA);
        await modals.dataShareConsent().clickDecline();
        return pages;
      })(),
      (async () => {
        const {pages, modals} = await createPagesForUser(browser, userB);
        await modals.dataShareConsent().clickDecline();
        return pages;
      })(),
    ]);

    await userAPages.conversationList().openConversation(userB.fullName);
    await userBPages.conversationList().openConversation(userA.fullName);
    await userAPages.conversation().sendMessage('Test Message');

    const message = userBPages.conversation().getMessageFromUser(userA);
    await expect(message).toContainText('Test Message');

    const messageOptions = await userBPages.conversation().openMessageOptions(message);
    await expect(messageOptions).not.toContainText('Edit');
  });

  test(
    'I can edit my last message by pressing the up arrow key',
    {tag: ['@TC-686', '@regression']},
    async ({browser, userA, userB}) => {
      const {pages: userAPages, modals} = await createPagesForUser(browser, userA);
      await modals.dataShareConsent().clickDecline();
      await userAPages.conversationList().openConversation(userB.fullName);
      await userAPages.conversation().sendMessage('Test Message');

      await userAPages.conversation().messageInput.press('ArrowUp');
      await expect(userAPages.conversation().messageInput).toContainText('Test Message');
    },
  );
});
