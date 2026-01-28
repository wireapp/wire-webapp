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
  let userC: User;
  let userD: User;
  let userE: User;
  let userF: User;

  test.beforeEach(async ({createTeam}) => {
    const team = await createTeam('Test Team', {withMembers: 5});
    userA = team.owner;
    userB = team.members[0];
    userC = team.members[1];
    userD = team.members[2];
    userE = team.members[3];
    userF = team.members[4];
  });

  const pingScenarios = [
    {
      id: '@TC-1490',
      title: 'Verify I can receive ping in 1:1',
      isGroup: false,
      pingCount: 1,
    },
    {
      id: '@TC-1491',
      title: 'Verify I can receive ping several times in a row',
      isGroup: false,
      pingCount: 5,
    },
    {
      id: '@TC-1492',
      title: 'Verify I can receive ping in group conversation',
      isGroup: true,
      pingCount: 1,
    },
  ];

  for (const scenario of pingScenarios) {
    test(scenario.title, {tag: [scenario.id, '@regression']}, async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      let conversationNameForB = userA.fullName;
      let conversationNameForA = userB.fullName;

      if (scenario.isGroup) {
        const conversationName = 'Test Group';
        await createGroup(userAPages, conversationName, [userB]);
        conversationNameForB = conversationName;
        conversationNameForA = conversationName;
      }

      await userBPages.conversationList().openConversation(conversationNameForB);

      for (let i = 0; i < scenario.pingCount; i++) {
        await userBPages.conversation().sendPing();
      }

      await userAPages.conversationList().openConversation(conversationNameForA);

      const pingMessage = userAPages.conversation().getPing();

      if (scenario.pingCount === 1) {
        await expect(pingMessage).toBeVisible();
      } else {
        await expect(pingMessage).toHaveCount(scenario.pingCount);
      }
    });
  }

  test(
    'Verify I see a warning when I ping in a big group',
    {tag: ['@TC-1496', '@regression']},
    async ({createPage}) => {
      const userAPage = await createPage(
        withLogin(userA),
        withConnectedUser(userB),
        withConnectedUser(userC),
        withConnectedUser(userD),
        withConnectedUser(userE),
        withConnectedUser(userF),
      );
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userAModals = PageManager.from(userAPage).webapp.modals;

      const conversationName = 'Test Group';
      await createGroup(userAPages, conversationName, [userB, userC, userD, userE, userF]);

      await userAPages.conversationList().openConversation(conversationName);
      await userAPages.conversation().sendPing();

      await expect(userAModals.confirm().modal).toBeVisible();
    },
  );
});
