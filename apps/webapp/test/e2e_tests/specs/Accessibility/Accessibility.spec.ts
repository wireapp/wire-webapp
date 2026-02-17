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
import {createGroup} from 'test/e2e_tests/utils/userActions';

import {expect, test, withConnectedUser, withLogin} from '../../test.fixtures';

test.describe('Accessibility', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam}) => {
    const team = await createTeam('Accessible Team', {withMembers: 1});
    userA = team.owner;
    userB = team.members[0];
  });

  test(
    'I want to see typing indicator in group conversation',
    {tag: ['@TC-46', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await createGroup(userAPages, 'Accessible Group', [userB]);
      await userAPages.conversationList().openConversation('Accessible Group');
      await userBPages.conversationList().openConversation('Accessible Group');

      await test.step('User A starts typing in group and B sees typing indicator', async () => {
        await userAPages.conversation().messageInput.pressSequentially('Test', {delay: 100});
        await expect(userBPages.conversation().typingIndicator).toBeVisible();
      });

      await test.step('User A turns off typing indicator', async () => {
        await userAPages.sidebar().preferencesButton.click();
        await userAPages.settings().accountButton.click();
        await userAPages.account().typingIndicator.setChecked(false);
      });

      await test.step('User A types more into group', async () => {
        await userAPages.sidebar().allConverationsButton.click();
        await userAPages.conversationList().openConversation('Accessible Group');
        await userAPages.conversation().messageInput.pressSequentially('Test', {delay: 100});
        // Since A disabled the typing indicator B should not see it
        await expect(userBPages.conversation().typingIndicator).not.toBeVisible();
      });

      await test.step('User B types into group', async () => {
        await userBPages.conversation().messageInput.pressSequentially('Test', {delay: 100});
        // Since A turned off typing indicators he should also not see one when B is typing
        await expect(userAPages.conversation().typingIndicator).not.toBeVisible();
      });
    },
  );

  test.describe('In collapsed view', () => {
    test.use({viewport: {width: 480, height: 800}});

    test('I want to see collapsed view when app is narrow', {tag: ['@TC-48', '@regression']}, async ({createPage}) => {
      const {components} = PageManager.from(await createPage(withLogin(userA))).webapp;
      await expect(components.conversationSidebar().sidebar).toHaveAttribute('data-is-collapsed', 'true');
    });

    test(
      'I should not lose a drafted message when switching between conversations in collapsed view',
      {tag: ['@TC-51', '@regression']},
      async ({createPage}) => {
        const pages = PageManager.from(await createPage(withLogin(userA), withConnectedUser(userB))).webapp.pages;

        await createGroup(pages, 'Test Group', [userB]);
        await pages.conversation().messageInput.fill('Draft Message');

        await pages.conversation().backButton.click();
        await pages.conversationList().openConversation(userB.fullName);
        await expect(pages.conversation().messageInput).toBeEmpty();

        await pages.conversation().backButton.click();
        await pages.conversationList().openConversation('Test Group');
        await expect(pages.conversation().messageInput).toHaveText('Draft Message');
      },
    );
  });
});
