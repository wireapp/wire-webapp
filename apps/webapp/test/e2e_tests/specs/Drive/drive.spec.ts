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
import {getVideoFilePath, VideoFileName} from 'test/e2e_tests/utils/asset.util';

import {test, expect, withLogin, withConnectedUser} from '../../test.fixtures';
import {createGroup} from '../../utils/userActions';

test.describe('Conversations', () => {
  // User A is a team owner, User B is a team member
  let userA: User;
  let userB: User;

  const teamName = 'Cells Critical Team';
  const conversationName = 'Cells Critical Conversation';
  const initialMessageText = 'Here is an image for you';
  const editedMessageText = 'Here is an image for you, friend';
  const replyMessageText = 'Nice image, thanks!';

  const imageFilePath = getImageFilePath();
  const videoFilePath = getVideoFilePath();

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

  test(
    'Edit multipart message in a group conversation',
    {tag: ['@crit-flow-cells', '@regression', '@TC-8786']},
    async ({createPage}) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))),
      ]);

      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;

      await test.step('Preconditions: Create group with drive enabled', async () => {
        await createGroup(userAPages, conversationName, [userB], {cells: true});
      });

      await test.step('User A sends a multipart message in a group conversation', async () => {
        await userAPages.conversationList().openConversation(conversationName);
        await userAComponents.inputBarControls().clickShareFile(imageFilePath);
        await userAComponents.inputBarControls().setMessageInput(initialMessageText);
        await userAComponents.inputBarControls().clickSendMessage();
        await userBPages.conversationList().openConversation(conversationName);

        const multipartMessage = userBPages.conversation().getMessage({sender: userA});
        await expect(multipartMessage).toContainText(initialMessageText);
        await expect(multipartMessage.getByRole('button', {name: `Image from ${userA.fullName}`})).toBeVisible();
      });

      await test.step('User A edits text part of the multipart message', async () => {
        const message = userAPages.conversation().getMessage({sender: userA});
        await userAPages.conversation().editMessage(message);
        await userAComponents.inputBarControls().setMessageInput(editedMessageText);
        await userAComponents.inputBarControls().clickSendMessage();

        const multipartMessage = userBPages.conversation().getMessage({sender: userA});
        await expect(multipartMessage).toContainText(editedMessageText);
        await expect(multipartMessage.getByRole('button', {name: `Image from ${userA.fullName}`})).toBeVisible();
      });
    },
  );

  test(
    'Replying to multipart message in a group conversation',
    {tag: ['@crit-flow-cells', '@regression', '@TC-8787']},
    async ({createPage}) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))),
      ]);

      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages, components: userBComponents} = userBPageManager.webapp;

      await test.step('Preconditions: Create group with drive enabled', async () => {
        await createGroup(userAPages, conversationName, [userB], {cells: true});
      });

      await test.step('User A sends a multipart message to User B in a group conversation', async () => {
        await userAPages.conversationList().openConversation(conversationName);
        await userAComponents.inputBarControls().clickShareFile(imageFilePath);
        await userAComponents.inputBarControls().setMessageInput(initialMessageText);
        await userAComponents.inputBarControls().clickSendMessage();
        await userBPages.conversationList().openConversation(conversationName);

        const multipartMessage = userBPages.conversation().getMessage({sender: userA});
        await expect(multipartMessage).toContainText(initialMessageText);
        await expect(multipartMessage.getByRole('button', {name: `Image from ${userA.fullName}`})).toBeVisible();
      });

      await test.step('User B replies to a multipart message', async () => {
        const message = userBPages.conversation().getMessage({sender: userA});
        await userBPages.conversation().replyToMessage(message);
        await userBComponents.inputBarControls().setMessageInput(replyMessageText);
        await userBComponents.inputBarControls().clickSendMessage();

        const reply = userAPages.conversation().getMessage({content: replyMessageText});
        await expect(reply).toBeVisible();
      });
    },
  );

  test(
    'Searching files in a group conversation',
    {tag: ['@crit-flow-cells', '@regression', '@TC-8788']},
    async ({createPage}) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))),
      ]);

      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;

      await test.step('Preconditions: Create group with drive enabled', async () => {
        await createGroup(userAPages, conversationName, [userB], {cells: true});
      });

      await test.step('User A sends a message with assets in a group conversation', async () => {
        await userAPages.conversationList().openConversation(conversationName);
        await userAComponents.inputBarControls().clickShareFile(imageFilePath);
        await userAComponents.inputBarControls().clickShareFile(videoFilePath);
        await userAComponents.inputBarControls().clickSendMessage();
        await userBPages.conversationList().openConversation(conversationName);

        await expect(userBPages.conversation().getImageInMultipartMessageLocator(userA)).toBeVisible();
        await expect(userBPages.conversation().getVideoInMultipartMessageLocator(userA)).toBeVisible();
      });

      await test.step('User B opens Files tab and searches for a file', async () => {
        await userBPages.conversation().clickFilesTab();

        // Initially both files should be visible
        await expect(userBPages.cellsConversationFiles().filesList).toHaveCount(2);

        // Files might take some time to get indexed by the search engine, that's why this block might be retried
        await expect(async () => {
          // Search for the video file
          await userBPages.cellsConversationFiles().searchFile(VideoFileName);
          await expect(userBPages.cellsConversationFiles().filesList).toHaveCount(1, {timeout: 1500});
          await expect(userBPages.cellsConversationFiles().getFile(VideoFileName)).toBeVisible({timeout: 500});
        }).toPass({intervals: [1_000, 2_000, 5_000], timeout: 10_000});
        // Search for a non-existing file
        await userBPages.cellsConversationFiles().searchFile('non-existing-file.txt');
        await expect(userBPages.cellsConversationFiles().filesList).toHaveCount(0);

        // Clearing the search input and making sure both files are visible again
        await userBPages.cellsConversationFiles().searchFile('');
        await expect(userBPages.cellsConversationFiles().filesList).toHaveCount(2);
      });
    },
  );
});
