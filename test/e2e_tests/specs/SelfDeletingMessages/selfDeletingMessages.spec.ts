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
import {test, expect, withLogin, withConnectedUser} from 'test/e2e_tests/test.fixtures';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Self Deleting Messages', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam}) => {
    const team = await createTeam('Test Team', {withMembers: 1});
    userA = team.owner;
    userB = team.members[0];
  });

  test('Verify sending ephemeral text message in 1:1', {tag: ['@TC-657', '@regression']}, async ({createPage}) => {
    const [userAPage, userBPage] = await Promise.all([
      createPage(withLogin(userA), withConnectedUser(userB)),
      createPage(withLogin(userB), withConnectedUser(userA)),
    ]);
    const userAPages = PageManager.from(userAPage).webapp.pages;
    const userBPages = PageManager.from(userBPage).webapp.pages;

    await userAPages.conversation().enableSelfDeletingMessages();
    await userAPages.conversation().sendMessage('Gone in 10s');
    await expect(userBPages.conversation().getMessage({content: 'Gone in 10s'})).toBeVisible();

    await userBPage.waitForTimeout(10_000); // Wait for 10s so the message is deleted
    await expect(userAPages.conversation().getMessage({content: 'Gone in 10s'})).not.toBeVisible();
    await expect(userBPages.conversation().getMessage({content: 'Gone in 10s'})).not.toBeVisible();
  });

  test('Verify sending ephemeral text message in group', {tag: ['@TC-658', '@regression']}, async ({createPage}) => {
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
  });

  test(
    'Verify timer is applied to all messages until turning it off in 1:1',
    {tag: ['@TC-662', '@regression']},
    async ({createPage}) => {
      const page = await createPage(withLogin(userA), withConnectedUser(userB));
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
    async ({context, createPage}) => {
      let page = await createPage(context, withLogin(userA), withConnectedUser(userB));
      let pages = PageManager.from(page).webapp.pages;

      await pages.conversation().enableSelfDeletingMessages();
      await pages.conversation().sendMessage('Test Message');
      await expect(pages.conversation().getMessage({sender: userA})).toBeVisible(); // Ensure message was sent before closing the page

      await page.close();
      await new Promise(res => setTimeout(res, 10_000)); // Wait 10s before logging in again to ensure the message has been deleted by now

      // Re-open page reusing the same context so the login is not happening on a new device
      page = await createPage(context, withLogin(userA));
      pages = PageManager.from(page).webapp.pages;
      await pages.conversationList().openConversation(userB.fullName);

      const selfDeletingMessage = pages.conversation().getMessage({sender: userA});
      await expect(selfDeletingMessage).toBeVisible();
      await expect(selfDeletingMessage).not.toContainText('Test Message');
    },
  );

  test(
    "Verify the message is not deleted for users that didn't read the message",
    {tag: ['@TC-675', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB), withConnectedUser(userA)),
      ]);
      const [userAPages, userBPages] = [userAPage, userBPage].map(page => PageManager.from(page).webapp.pages);
      await createGroup(userAPages, 'Test Group', [userB]);

      await userAPages.conversationList().openConversation('Test Group');
      await userBPages.conversationList().openConversation(userA.fullName); // User B should not read the message sent into the group immediately

      await userAPages.conversation().enableSelfDeletingMessages();
      await userAPages.conversation().sendMessage('Test Message');
      await expect(userAPages.conversation().getMessage({sender: userA})).toBeVisible();

      await userBPage.waitForTimeout(10_000); // Wait 10s before user B opens the group chat

      await userBPages.conversationList().openConversation('Test Group');
      await expect(userBPages.conversation().getMessage({content: 'Test Message'})).toBeVisible();
    },
  );

  test('I want to set a global group conversation timer', {tag: ['@TC-3715', '@regression']}, async ({createPage}) => {
    const page = await createPage(withLogin(userA));
    const pages = PageManager.from(page).webapp.pages;
    await createGroup(pages, 'Test Group', [userB]);

    await pages.conversationList().openConversation('Test Group');
    await pages.conversation().toggleGroupInformation();
    await pages.conversationDetails().setSelfDeletingMessages('10 seconds');

    await pages.conversation().sendMessage('Message');
    const message = pages.conversation().getMessage({content: 'Message'});
    await expect(message).toBeAttached();

    await page.waitForTimeout(10_000);
    await expect(message).not.toBeAttached();
  });

  test(
    'I want to see the current timer in conversation details',
    {tag: ['@TC-3716', '@regression']},
    async ({createPage}) => {
      const pages = PageManager.from(await createPage(withLogin(userA))).webapp.pages;
      await createGroup(pages, 'Test Group', [userB]);

      await pages.conversationList().openConversation('Test Group');
      await pages.conversation().toggleGroupInformation();
      await pages.conversationDetails().setSelfDeletingMessages('10 seconds');

      await expect(pages.conversationDetails().selfDeletingMessageButton).toContainText('10 seconds');
    },
  );

  test(
    'I want to see timed message disable in an input bar when global settings conversation options are set',
    {tag: ['@TC-3718', '@regression']},
    async ({createPage}) => {
      const pages = PageManager.from(await createPage(withLogin(userA))).webapp.pages;
      await createGroup(pages, 'Test Group', [userB]);

      await pages.conversationList().openConversation('Test Group');
      await pages.conversation().toggleGroupInformation();
      await pages.conversationDetails().setSelfDeletingMessages('10 seconds');

      await expect(pages.conversation().timerMessageButton).toBeDisabled();
    },
  );

  test(
    'I want to see the ephemeral indicator is updated in the input field if someone sets a global timer in conversation options',
    {tag: ['@TC-3719', '@regression']},
    async ({createPage}) => {
      const pages = PageManager.from(await createPage(withLogin(userA))).webapp.pages;
      await createGroup(pages, 'Test Group', [userB]);

      await pages.conversationList().openConversation('Test Group');
      await pages.conversation().toggleGroupInformation();
      await pages.conversationDetails().setSelfDeletingMessages('10 seconds');

      await expect(pages.conversation().timerMessageButton).toContainText('s10');
    },
  );

  test(
    'I want to see a system message that a global timer was set or changed or removed in conversation options',
    {tag: ['@TC-3720', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
      const [userAPages, userBPages] = [userAPage, userBPage].map(page => PageManager.from(page).webapp.pages);
      await createGroup(userAPages, 'Test Group', [userB]);

      await userAPages.conversationList().openConversation('Test Group');
      await userAPages.conversation().toggleGroupInformation();
      await userAPages.conversationDetails().setSelfDeletingMessages('10 seconds');

      await userBPages.conversationList().openConversation('Test Group');
      await expect(
        userBPages.conversation().systemMessages.getByText('set the message timer to 10 seconds'),
      ).toBeAttached();

      await userAPages.conversationDetails().setSelfDeletingMessages('Off');
      await expect(userBPages.conversation().systemMessages.getByText('turned off the message timer')).toBeAttached();
    },
  );
});
