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
import {test, expect, withLogin} from 'test/e2e_tests/test.fixtures';
import {connectWithUser} from 'test/e2e_tests/utils/userActions';

test.describe('Cross Platform', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    const team = await createTeam('Test Team', {users: [userB]});
    userA = team.owner;
  });

  test(
    'Verify you can see location sent from mobile and delete it from conversation view',
    {tag: ['@TC-1280', '@regression']},
    async ({createPage, api}) => {
      const userAPage = await createPage(withLogin(userA));
      const userBPage = await createPage(withLogin(userB));
      await connectWithUser(userAPage, userB);

      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await test.step('User A sends location to User B via second device', async () => {
        const {instanceId} = await api.testService.createInstance(
          userA.password,
          userA.email,
          'Test Service Device',
          false,
        );
        const conversationId = await api.conversation.getConversationWithUser(userA.token, userB.id!);
        if (conversationId === undefined) throw new Error("Couldn't find conversation of userA with userB");
        await api.testService.sendLocation(instanceId, conversationId, {
          locationName: 'Test Location',
          latitude: 52.5170365,
          longitude: 13.404954,
          zoom: 42,
        });
      });

      await userAPages.conversationList().getConversation(userB.fullName, {protocol: 'mls'}).open();
      await userBPages.conversationList().getConversation(userA.fullName, {protocol: 'mls'}).open();

      const messageWithLocationShare = userAPages.conversation().getMessage({sender: userA});
      await expect(messageWithLocationShare).toBeVisible();

      const messageFromUserA = userBPages.conversation().getMessage({sender: userA});
      await expect(messageFromUserA).toBeVisible();

      await userAPages.conversation().deleteMessage(messageWithLocationShare, 'Everyone');

      await expect(messageWithLocationShare).not.toBeVisible();
      await expect(messageFromUserA).not.toBeVisible();
    },
  );
});
