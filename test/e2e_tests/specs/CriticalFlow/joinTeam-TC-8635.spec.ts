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
import {createGroup} from 'test/e2e_tests/utils/userActions';

import {test, expect, withLogin, withConnectedUser} from '../../test.fixtures';

test(
  'New person joins team and setups up device',
  {tag: ['@TC-8635', '@crit-flow-web']},
  async ({createTeam, createPage, createUser}) => {
    const team = await createTeam('Test Team', {withMembers: 1});
    const owner = team.owner;
    const existingMember = team.members[0];

    const ownerPages = PageManager.from(await createPage(withLogin(owner))).webapp.pages;

    await test.step('Precondition: Team has a group chat with existing members', async () => {
      await createGroup(ownerPages, 'Test Group', [existingMember]);
    });

    const userA = await createUser();
    await test.step('Owner adds user A to team', async () => {
      await team.addMember(userA);
    });

    const userAPages = PageManager.from(await createPage(withLogin(userA), withConnectedUser(owner))).webapp.pages;

    await test.step('A sends text to owner', async () => {
      await userAPages.conversationList().openConversation(owner.fullName);
      await userAPages.conversation().sendMessage('Hello Team Owner!');

      await ownerPages.conversationList().openConversation(userA.fullName);
      await expect(ownerPages.conversation().getMessage({content: 'Hello Team Owner!'})).toBeVisible();
    });

    await test.step('Owner sends a text to A', async () => {
      await ownerPages.conversation().sendMessage('Keep up the good work!');
      await expect(userAPages.conversation().getMessage({content: 'Keep up the good work!'})).toBeVisible();
    });

    await test.step('Owner adds A to group chat and mentions him', async () => {
      await ownerPages.conversationList().openConversation('Test Group');

      // Add user A to group chat
      await ownerPages.conversation().toggleGroupInformation();
      await ownerPages.conversationDetails().clickAddPeopleButton();
      await ownerPages.conversationDetails().addUsersToConversation([userA.fullName]);
      await ownerPages.conversation().toggleGroupInformation();

      await ownerPages.conversation().sendMessageWithUserMention(userA.fullName);
    });

    await test.step('User A receives mention in group chat', async () => {
      await userAPages.conversationList().openConversation('Test Group');
      await expect(userAPages.conversation().getMessage({content: `@${userA.fullName}`})).toBeVisible();
    });
  },
);
