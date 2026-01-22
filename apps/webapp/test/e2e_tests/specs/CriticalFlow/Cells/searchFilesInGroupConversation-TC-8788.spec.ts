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
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';

import {test, expect, withLogin} from '../../../test.fixtures';
import {getVideoFilePath, VideoFileName} from 'test/e2e_tests/utils/asset.util';

// User A is a team owner, User B is a team member
let userA: User;
let userB: User;

const teamName = 'Cells Critical Team';
const conversationName = 'Cells Critical Conversation';

const imageFilePath = getImageFilePath();
const videoFilePath = getVideoFilePath();

test.beforeEach(async ({createTeam}) => {
  const team = await createTeam(teamName, {withMembers: 1, disableTelemetry: true});
  userA = team.owner;
  userB = team.members[0];
});

test(
  'Searching files in a group conversation',
  {tag: ['@crit-flow-cells', '@regression', '@TC-8788']},
  async ({createPage, api}) => {
    const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);

    const {pages: userAPages, components: userAComponents} = PageManager.from(userAPage).webapp;
    const userBPages = PageManager.from(userBPage).webapp.pages;

    await test.step('Preconditions: Creating preconditions for the test via API', async () => {
      await api.brig.unlockCellsFeature(userA.teamId);
      await api.brig.enableCells(userA.teamId);
    });

    await test.step('Preconditions: Both users log in and open the group', async () => {
      await userAPages.conversationList().clickCreateGroup();
      // Files should be disabled by default
      expect(await userAPages.groupCreation().isFilesCheckboxChecked()).toBeFalsy();

      await userAPages.groupCreation().enableFilesCheckbox();
      await userAPages.groupCreation().setGroupName(conversationName);
      await userAPages.groupCreation().selectGroupMembers(userB.username);
      await userAPages.groupCreation().clickCreateGroupButton();
    });

    await test.step('User A sends a message with assets in a group conversation', async () => {
      await userAPages.conversationList().openConversation(conversationName);
      await userAComponents.inputBarControls().clickShareFile(imageFilePath);
      await userAComponents.inputBarControls().clickShareFile(videoFilePath);
      await userAComponents.inputBarControls().clickSendMessage();
      await userBPages.conversationList().openConversation(conversationName);

      expect(await userBPages.cellsConversation().isImageFromUserVisible(userA)).toBeTruthy();
      expect(await userBPages.cellsConversation().isVideoFromUserVisible(userA)).toBeTruthy();
    });

    await test.step('User B opens Files tab and searches for a file', async () => {
      await userBPages.conversationList().openConversation(conversationName);
      await userBPages.conversation().clickFilesTab();

      // Initially both files should be visible
      await expect(userBPages.cellsConversationFiles().filesList).toHaveCount(2);

      // Search for a non-existing file
      await userBPages.cellsConversationFiles().searchFile('non-existing-file.txt');
      await expect(userBPages.cellsConversationFiles().filesList).toHaveCount(0);

      // Search for the video file
      await userBPages.cellsConversationFiles().searchFile(VideoFileName);
      await expect(userBPages.cellsConversationFiles().filesList).toHaveCount(1);
      expect(await userBPages.cellsConversationFiles().getFile(VideoFileName)).toBeVisible();

      // Clearing the search input and making sure both files are visible again
      await userBPages.cellsConversationFiles().searchFile('');
      await expect(userBPages.cellsConversationFiles().filesList).toHaveCount(2);
    });
  },
);
