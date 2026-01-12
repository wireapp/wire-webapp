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
import {test, expect, withLogin} from 'test/e2e_tests/test.fixtures';
import {createGroup} from '../../utils/userActions';

test.describe('Search', () => {
  test(
    'Verify you can search by partial username of unconnected user',
    {tag: ['@TC-1657', '@regression']},
    async ({createUser, createPage}) => {
      const [userA, userB] = await Promise.all([createUser(), createUser()]);
      const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;
      const partialUsername = userB.username.slice(0, -1);

      await userAComponents.conversationSidebar().clickConnectButton();
      await userAPages.startUI().searchInput.fill(partialUsername);

      await expect(userAPages.startUI().searchResults).toContainText(userB.username);
    },
  );

  // TODO: blocked by [WPB-222687] - search result remains empty
  test.skip(
    'Verify search by username with at (@) symbol',
    {tag: ['@TC-1658', '@regression']},
    async ({createUser, createPage}) => {
      const [userA, userB] = await Promise.all([createUser(), createUser()]);
      const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
      const userAPages = userAPageManager.webapp.pages;

      const conversationName = 'Group conversation';
      await createGroup(userAPages, conversationName, [userB]);
      await userAPages.conversationList().openConversation(conversationName);
      await userAPages.conversation().sendMessage(`@${userB.username} Group message with mention of User B`);
      await userAPages.conversationList().searchConversation(`@${userB.username}`);

      await expect(userAPages.conversationList().getConversationLocator(conversationName)).toBeVisible();
      await expect(userAPages.conversationList().getConversationLocator(userB.fullName)).toBeVisible();
    },
  );

  test(
    'Verify result for direct hit is shown on top when searching for unique username',
    {tag: ['@TC-1662', '@regression']},
    async ({createUser, createPage}) => {
      const [userA, userB] = await Promise.all([createUser(), createUser()]);
      const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;

      await userAComponents.conversationSidebar().clickConnectButton();
      await userAPages.startUI().searchInput.fill('@' + userB.username);
      await expect(userAPages.startUI().searchResults).toContainText(userB.username);
      await expect(userAPages.startUI().searchResults).toHaveCount(1);
    },
  );

  test(
    'I want to see search result when searching for unique username without @ in the beginning',
    {tag: ['@TC-1665', '@regression']},
    async ({createUser, createPage}) => {
      const [userA, userB] = await Promise.all([createUser(), createUser()]);
      const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;

      await userAComponents.conversationSidebar().clickConnectButton();
      await userAPages.startUI().searchInput.fill(userB.username);
      await expect(userAPages.startUI().searchResults).toContainText(userB.username);
    },
  );
});
