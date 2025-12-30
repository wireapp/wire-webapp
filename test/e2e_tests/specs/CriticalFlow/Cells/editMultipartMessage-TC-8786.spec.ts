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
const initialMessageText = 'Here is an image for you';
const editedMessageText = 'Here is an image for you, friend';

const imageFilePath = getImageFilePath();

test(
  'Edit multipart message in a group conversation',
  {tag: ['@crit-flow-cells', '@regression', '@TC-8786']},
  async ({pageManager: userAPageManager, browser, api}) => {
    const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;

    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();
    const userBPageManager = new PageManager(userBPage);

    const {pages: userBPages, modals: userBModals, components: userBComponents} = userBPageManager.webapp;

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
        await userAPages.startUI().selectUsers([userB.username]);
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
      await userBPages.conversationList().openConversation(conversationName);

      // Wait for some time before uploading the file to make sure the cell is ready
      await new Promise(resolve => setTimeout(resolve, 5000));
    });

    await test.step('User A sends a multipart message in a group conversation', async () => {
      await userAPages.conversationList().openConversation(conversationName);
      await userAComponents.inputBarControls().clickShareFile(imageFilePath);
      await userAComponents.inputBarControls().setMessageInput(initialMessageText);
      await userAComponents.inputBarControls().clickSendMessage();

      expect(await userBPages.cellsConversation().isMultipartMessageVisible(userA, initialMessageText)).toBeTruthy();
    });

    await test.step('User A edits text part of the multipart message', async () => {
      const message = userAPages.cellsConversation().getMessage({sender: userA});
      await userAPages.cellsConversation().editMessage(message);
      await userAComponents.inputBarControls().setMessageInput(editedMessageText);
      await userAComponents.inputBarControls().clickSendMessage();

      expect(await userBPages.cellsConversation().isMultipartMessageVisible(userA, editedMessageText)).toBeTruthy();
    });
  },
);

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, userA);
});
