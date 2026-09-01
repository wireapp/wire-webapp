/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 */

import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {expect, test, withLogin} from 'test/e2e_tests/test.fixtures';
import {getTextFilePath, TextFileName} from 'test/e2e_tests/utils/asset.util';
import {connectWithUser, createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Shared Drive direct upload', () => {
  let owner: User;
  let member: User;

  const conversationName = 'Shared Drive direct upload';

  test.beforeEach(async ({createTeam, createUser}) => {
    member = await createUser();
    const team = await createTeam('Shared Drive direct upload team', {users: [member], features: {cells: true}});
    owner = team.owner;
  });

  test('uploads a file from New in a group Shared Drive', {tag: ['@regression']}, async ({createPage}) => {
    const [ownerPageManager, memberPageManager] = await Promise.all([
      PageManager.from(createPage(withLogin(owner))),
      PageManager.from(createPage(withLogin(member))),
    ]);
    const {pages: ownerPages} = ownerPageManager.webapp;
    const {pages: memberPages} = memberPageManager.webapp;

    await connectWithUser(ownerPageManager, member);
    await createGroup(ownerPages, conversationName, [member], {cells: true});

    await test.step('The owner uploads a file from Shared Drive New', async () => {
      await ownerPages.conversationList().getConversation(conversationName).open();
      await ownerPages.conversation().clickFilesTab();
      await ownerPages.cellsConversationFiles().uploadFile(getTextFilePath());

      await expect(ownerPages.cellsConversationFiles().getFile(TextFileName)).toBeVisible();
    });

    await test.step('A group member sees the uploaded file', async () => {
      await memberPages.conversationList().getConversation(conversationName).open();
      await memberPages.conversation().clickFilesTab();

      await expect(memberPages.cellsConversationFiles().getFile(TextFileName)).toBeVisible({timeout: 30_000});
    });
  });
});
