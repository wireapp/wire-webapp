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
import {shareAssetHelper} from 'test/e2e_tests/utils/asset.util';
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';
import {createGroup} from '../../utils/userActions';

test.describe('Read Receipts', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    const team = await createTeam('Test Team', {users: [userB]});
    userA = team.owner;
  });

  test('I want to see read receipts for assets: picture', {tag: ['@TC-3552', '@regression']}, async ({createPage}) => {
    const [userAPage, userBPage] = await Promise.all([
      createPage(withLogin(userA), withConnectedUser(userB)),
      createPage(withLogin(userB)),
    ]);

    const {pages: userAPages, components: userAComponents} = PageManager.from(userAPage).webapp;
    const {pages: userBPages, components: userBComponents} = PageManager.from(userBPage).webapp;

    // Preconditions: User A and User B have read receipts turned on
    await userAComponents.conversationSidebar().preferencesButton.click();
    await userAPages.account().readReceiptsCheckbox.click();
    await userAComponents.conversationSidebar().allConversationsButton.click();

    await userBComponents.conversationSidebar().preferencesButton.click();
    await userBPages.account().readReceiptsCheckbox.click();
    await userBComponents.conversationSidebar().allConversationsButton.click();

    const conversationName = 'Group Conversation';
    await createGroup(userAPages, conversationName, [userB]);
    await userAPages.conversationList().getConversation(conversationName).open();

    await userBPages.conversationList().getConversation(userA.fullName, {protocol: 'mls'}).open();
    await shareAssetHelper(getImageFilePath(), userBPage, userBPage.getByRole('button', {name: 'Add picture'}));

    await userAPages.conversationList().getConversation(userB.fullName, {protocol: 'mls'}).open();
    const messageWithImage = userAPages.conversation().getMessage({sender: userB});
    await expect(messageWithImage).toBeVisible();

    const messageWithReadReceipt = userBPages.conversation().getMessage({sender: userB});
    await expect(await userAPages.conversation().getMessageReadReceipt(messageWithReadReceipt)).toBeVisible();
  });
});
