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

import {Page} from 'playwright/test';
import {ApiManagerE2E} from 'test/e2e_tests/backend/apiManager.e2e';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, expect, withConnectedUser, withLogin, Team} from 'test/e2e_tests/test.fixtures';
import {getAudioFilePath, getTextFilePath, getVideoFilePath, shareAssetHelper} from 'test/e2e_tests/utils/asset.util';
import {interceptNotifications} from 'test/e2e_tests/utils/mockNotifications.util';
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Group Conversation', () => {
  let team: Team;
  let userA: User;
  let userB: User;
  let userC: User;
  const groupName = 'Test group';

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    team = await createTeam('Test Team', {users: [userB]});
    userA = team.owner;
  });

  test('I can create a conversation with myself only', {tag: ['@TC-509', '@regression']}, async ({createPage}) => {
    const userAPages = PageManager.from(await createPage(withLogin(userA))).webapp.pages;

    await createGroup(userAPages, groupName, []);
    await userAPages.conversationList().openConversation(groupName);

    await userAPages.conversation().sendMessage('Message');
    const message = userAPages.conversation().getMessage({content: 'Message'});

    await userAPages.conversation().toggleGroupInformation();
    await expect(userAPages.conversation().membersList.getByRole('listitem')).toHaveCount(0);

    await expect(
      userAPages.conversation().systemMessages.filter({hasText: 'ALL FINGERPRINTS ARE VERIFIED'}),
    ).toBeVisible();
    await expect(message).toBeVisible();
  });

  test(
    'I cannot set empty or space-only conversation name',
    {tag: ['@TC-514', '@regression']},
    async ({createPage}) => {
      const userAPages = PageManager.from(await createPage(withLogin(userA))).webapp.pages;

      await userAPages.conversationList().clickCreateGroup();
      await userAPages.groupCreation().groupNameInput.fill(' ');
      await expect(userAPages.groupCreation().errorGroupName).toHaveText('At least 1 character');
    },
  );
});
