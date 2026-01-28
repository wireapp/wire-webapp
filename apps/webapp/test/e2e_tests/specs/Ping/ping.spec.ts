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
import {createGroup} from '../../utils/userActions';

test.describe('Ping', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam}) => {
    const team = await createTeam('Test Team', {withMembers: 1});
    userA = team.owner;
    userB = team.members[0];
  });

  test('Verify I can receive ping in 1:1', {tag: ['@TC-1490', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName);
    await userBPages.conversation().sendPing();

    await userAPages.conversationList().openConversation(userB.fullName);
    await expect(userAPages.conversation().getPing()).toBeVisible();
  });

  test('Verify I can receive ping several times in a row', {tag: ['@TC-1491', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName);
    await userBPages.conversation().sendPing();
    await userBPages.conversation().sendPing();
    await userBPages.conversation().sendPing();
    await userBPages.conversation().sendPing();
    await userBPages.conversation().sendPing();

    await userAPages.conversationList().openConversation(userB.fullName);
    await expect(userAPages.conversation().getPing()).toHaveCount(5);
  });

  test('Verify I can receive ping in group conversation', {tag: ['@TC-1492', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    const conversationName = 'Test Group';
    await createGroup(userAPages, conversationName, [userB]);

    await userBPages.conversationList().openConversation(conversationName);
    await userBPages.conversation().sendPing();

    await userAPages.conversationList().openConversation(conversationName);
    await expect(userAPages.conversation().getPing()).toBeVisible();
  });
});
