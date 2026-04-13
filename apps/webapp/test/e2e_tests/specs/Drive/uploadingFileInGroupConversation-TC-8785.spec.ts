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
import {getImageFilePath, getLocalQRCodeValue, ImageQRCodeFileName} from 'test/e2e_tests/utils/sendImage.util';
import {createGroup} from 'test/e2e_tests/utils/userActions';

import {test, expect, withLogin, withConnectedUser} from '../../test.fixtures';

// User A is a team owner, User B is a team member
let userA: User;
let userB: User;

const teamName = 'Cells Critical Team';
const conversationName = 'Cells Critical Conversation';

const imageFilePath = getImageFilePath();

test.beforeEach(async ({createTeam, createUser}) => {
  userB = await createUser();
  const team = await createTeam(teamName, {users: [userB], features: {cells: true}});
  userA = team.owner;
});

test(
  'Uploading an file in a group conversation',
  {tag: ['@crit-flow-cells', '@regression', '@TC-8785']},
  async ({createPage}, testInfo) => {
    const [userAPageManager, userBPageManager] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
      PageManager.from(createPage(withLogin(userB))),
    ]);

    const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;
    const {pages: userBPages, modals: userBModals} = userBPageManager.webapp;

    await test.step('Preconditions: Both users log in and open the group', async () => {
      await createGroup(userAPages, conversationName, [userB], {cells: true});
    });

    await test.step('User A sends an image to User B in a group conversation', async () => {
      await userAPages.conversationList().openConversation(conversationName);
      await userBPages.conversationList().openConversation(conversationName);
      await userAComponents.inputBarControls().clickShareFile(imageFilePath);
      await userAComponents.inputBarControls().clickSendMessage();

      await expect(userBPages.conversation().getCellsImageLocator(userA)).toBeVisible();
    });

    await test.step('User B opens the image in the conversation', async () => {
      await userBPages.conversation().getCellsImageLocator(userA).click();

      await expect(userBModals.cellsFileDetailView().image).toBeVisible();
    });

    await test.step('User B downloads the image in the conversation', async () => {
      const filePath = await userBModals.cellsFileDetailView().downloadAsset(testInfo.outputDir);
      const downloadQRCodeValue = await getLocalQRCodeValue(filePath);
      const localQRCodeValue = await getLocalQRCodeValue(imageFilePath);
      expect(downloadQRCodeValue).toBe(localQRCodeValue);
    });

    await test.step('User A opens group conversation files and sees the image file there', async () => {
      await userAPages.conversation().clickFilesTab();
      await userAPages.cellsConversationFiles().getFile(ImageQRCodeFileName).click();

      await expect(userAModals.cellsFileDetailView().image).toBeVisible();
    });
  },
);
