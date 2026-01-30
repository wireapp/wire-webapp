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

import {getUser} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {getImageFilePath, getLocalQRCodeValue, ImageQRCodeFileName} from 'test/e2e_tests/utils/sendImage.util';
import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDown.util';
import {inviteMembers, loginUser} from 'test/e2e_tests/utils/userActions';

import {test, expect} from '../../../test.fixtures';

// User A is a team owner, User B is a team member
let userA = getUser();
userA.firstName = 'integrationtest';
userA.lastName = 'integrationtest';
userA.fullName = 'integrationtest';

const userB = getUser();

const teamName = 'Cells Critical Team';
const conversationName = 'Cells Critical Conversation';

const imageFilePath = getImageFilePath();

test(
  'Uploading an file in a group conversation',
  {tag: ['@crit-flow-cells', '@regression']},
  async ({pageManager: userAPageManager, browser, api}) => {
    const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;

    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();
    const userBPageManager = new PageManager(userBPage);

    const {pages: userBPages, modals: userBModals} = userBPageManager.webapp;

    await test.step('Preconditions: Creating preconditions for the test via API', async () => {
      await api.createTeamOwner(userA, teamName).then(user => {
        userA = {...userA, ...user};
      });
      addCreatedTeam(userA, userA.teamId);
      await inviteMembers([userB], userA, api);

      await api.brig.unlockCellsFeature(userA.teamId);
      await api.brig.enableCells(userA.teamId);
    });

    await test.step('Preconditions: Both users log in and open the group', async () => {
      const loginOwner = async () => {
        await userAPageManager.openMainPage();
        await loginUser(userA, userAPageManager);
        if (process.env.ENV_NAME === 'staging') {
          await userAModals.dataShareConsent().clickDecline();
        }
        await userAPages.conversationList().clickCreateGroup();
        // Files should be disabled by default
        expect(await userAPages.groupCreation().isFilesCheckboxChecked()).toBeFalsy();

        await userAPages.groupCreation().enableFilesCheckbox();
        await userAPages.groupCreation().setGroupName(conversationName);
        await userAPages.groupCreation().selectGroupMembers(userB.username);
        await userAPages.groupCreation().clickCreateGroupButton();
      };

      const loginMember = async () => {
        await userBPageManager.openMainPage();
        await loginUser(userB, userBPageManager);
        if (process.env.ENV_NAME === 'staging') {
          await userBModals.dataShareConsent().clickDecline();
        }
      };

      await Promise.all([loginOwner(), loginMember()]);

      // Wait for some time before uploading the file to make sure the cell is ready
      await new Promise(resolve => setTimeout(resolve, 5000));
    });

    await test.step('User A sends an image to User B in a group conversation', async () => {
      await userAPages.conversationList().openConversation(conversationName);
      await userAComponents.inputBarControls().clickShareFile(imageFilePath);
      await userAComponents.inputBarControls().clickSendMessage();

      expect(userBPages.cellsConversation().isImageFromUserVisible(userA)).toBeTruthy();
    });

    await test.step('User B opens the image in the conversation', async () => {
      await userBPages.conversationList().openConversation(conversationName);
      await userBPages.cellsConversation().clickImage(userA);

      expect(await userBModals.cellsFileDetailView().isImageVisible()).toBeTruthy();
    });

    await test.step('User B downloads the image in the conversation', async () => {
      const filePath = await userBModals.cellsFileDetailView().downloadAsset();
      const downloadQRCodeValue = await getLocalQRCodeValue(filePath);
      const localQRCodeValue = await getLocalQRCodeValue(imageFilePath);
      expect(downloadQRCodeValue).toBe(localQRCodeValue);
    });

    await test.step('User A opens group conversation files and sees the image file there', async () => {
      await userAPages.conversation().clickFilesTab();
      await userAPages.cellsConversationFiles().getFile(ImageQRCodeFileName).click();

      expect(await userAModals.cellsFileDetailView().isImageVisible()).toBeTruthy();
    });
  },
);

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, userA);
});
