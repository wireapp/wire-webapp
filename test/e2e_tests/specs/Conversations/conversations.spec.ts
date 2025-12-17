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
import {test, withLogin, expect} from 'test/e2e_tests/test.fixtures';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Conversations', () => {
  let userA: User;
  let userB: User;
  let userC: User;

  test.beforeEach(async ({createTeam}) => {
    const team = await createTeam('Test Team', {withMembers: 2});
    userA = team.owner;
    userB = team.members[0];
    userC = team.members[1];
  });

  test(
    'I want to see a system message with all group members mentioned on creating a group',
    {tag: ['@TC-2965', '@regression']},
    async ({createPage}) => {
      const userAPages = PageManager.from(await createPage(withLogin(userA))).webapp.pages;

      await createGroup(userAPages, 'Test Group', [userB, userC]);
      await userAPages.conversationList().openConversation('Test Group');

      await expect(userAPages.conversation().systemMessages.filter({hasText: userB.fullName})).toBeVisible();
      await expect(userAPages.conversation().systemMessages.filter({hasText: userC.fullName})).toBeVisible();
    },
  );

  test(
    'I want to see a system message with all group members mentioned when someone else created a group',
    {tag: ['@TC-2966', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages, userCPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userC))).then(pm => pm.webapp.pages),
      ]);
      await createGroup(userAPages, 'Test Group', [userB, userC]);

      await userBPages.conversationList().openConversation('Test Group');
      await expect(userBPages.conversation().systemMessages.filter({hasText: userA.fullName})).toBeVisible();
      await expect(userBPages.conversation().systemMessages.filter({hasText: userC.fullName})).toBeVisible();

      await userCPages.conversationList().openConversation('Test Group');
      await expect(userCPages.conversation().systemMessages.filter({hasText: userA.fullName})).toBeVisible();
      await expect(userCPages.conversation().systemMessages.filter({hasText: userB.fullName})).toBeVisible();
    },
  );

  test(
    'I want to see "No matching results. Try entering a different name." when I search for non existent users',
    {tag: ['@TC-2987', '@regression']},
    async ({createPage}) => {
      const pages = PageManager.from(await createPage(withLogin(userA))).webapp.pages;

      await pages.conversationList().clickCreateGroup();
      await pages.groupCreation().setGroupName('Test Group');
      await pages.groupCreation().searchUserInput.fill('Non-existent User');
      await expect(pages.groupCreation().contactsList).toContainText('No matching results');

      await pages.groupCreation().skipButton.click();
      await pages.conversationList().openConversation('Test Group');
      await pages.conversation().toggleGroupInformation();

      const addPeopleSidebar = await pages.conversationDetails().clickAddPeopleButton();
      await addPeopleSidebar.searchInput.fill('Non-existent User');
      await expect(addPeopleSidebar).toContainText('No matching results');
    },
  );
});
