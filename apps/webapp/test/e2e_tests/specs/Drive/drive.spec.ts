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
import {getTextFilePath, getVideoFilePath, TextFileName, VideoFileName} from 'test/e2e_tests/utils/asset.util';
import {driveBulkActionsFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';

import {test, expect, withLogin} from '../../test.fixtures';
import {connectWithUser, createGroup} from '../../utils/userActions';
import {ConversationPage} from '../../pageManager/webapp/pages/conversation.page';
import {Locator} from '@playwright/test';

const getMultipartAssetRoot = (conversation: ConversationPage, user: User): Locator => {
  return conversation.messageItems.getByLabel(new RegExp(`^Image from ${user.fullName}`));
};

const getImageInMultipartMessageLocator = (conversation: ConversationPage, user: User): Locator => {
  return getMultipartAssetRoot(conversation, user).getByRole('img');
};

const getVideoInMultipartMessageLocator = (conversation: ConversationPage, user: User): Locator => {
  return getMultipartAssetRoot(conversation, user).locator('video');
};

const getCellsImageLocator = (conversation: ConversationPage, user: User): Locator => {
  return conversation.messageItems.getByRole('button', {name: new RegExp(`^Image from ${user.fullName}`)});
};

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
        PageManager.from(createPage(withLogin(userA))),
        PageManager.from(createPage(withLogin(userB))),
      ]);
      await connectWithUser(userAPageManager, userB);

      const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages, modals: userBModals} = userBPageManager.webapp;

      await test.step('Preconditions: Both users log in and open the group', async () => {
        await createGroup(userAPages, conversationName, [userB], {cells: true});
      });

      await test.step('User A sends an image to User B in a group conversation', async () => {
        await userAPages.conversationList().getConversation(conversationName).open();
        await userBPages.conversationList().getConversation(conversationName).open();
        await userAComponents.inputBarControls().clickShareFile(imageFilePath);
        await userAComponents.inputBarControls().clickSendMessage();

        await expect(getCellsImageLocator(userBPages.conversation(), userA)).toBeVisible();
      });

      await test.step('User B opens the image in the conversation', async () => {
        await getCellsImageLocator(userBPages.conversation(), userA).click();

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
        PageManager.from(createPage(withLogin(userA))),
        PageManager.from(createPage(withLogin(userB))),
      ]);
      await connectWithUser(userAPageManager, userB);

      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;

      await test.step('Preconditions: Create group with drive enabled', async () => {
        await createGroup(userAPages, conversationName, [userB], {cells: true});
      });

      await test.step('User A sends a multipart message in a group conversation', async () => {
        await userAPages.conversationList().getConversation(conversationName).open();
        await userAComponents.inputBarControls().clickShareFile(imageFilePath);
        await userAComponents.inputBarControls().setMessageInput(initialMessageText);
        await userAComponents.inputBarControls().clickSendMessage();
        await userBPages.conversationList().getConversation(conversationName).open();

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
        PageManager.from(createPage(withLogin(userA))),
        PageManager.from(createPage(withLogin(userB))),
      ]);
      await connectWithUser(userAPageManager, userB);

      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages, components: userBComponents} = userBPageManager.webapp;

      await test.step('Preconditions: Create group with drive enabled', async () => {
        await createGroup(userAPages, conversationName, [userB], {cells: true});
      });

      await test.step('User A sends a multipart message to User B in a group conversation', async () => {
        await userAPages.conversationList().getConversation(conversationName).open();
        await userAComponents.inputBarControls().clickShareFile(imageFilePath);
        await userAComponents.inputBarControls().setMessageInput(initialMessageText);
        await userAComponents.inputBarControls().clickSendMessage();
        await userBPages.conversationList().getConversation(conversationName).open();

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
    'recovers from a failed bulk move after an explicit Drive refresh',
    {tag: ['@crit-flow-cells', '@regression']},
    async ({createPage}) => {
      const page = await createPage(
        withLogin(userA, {startupFeatureToggles: {[driveBulkActionsFeatureToggleName]: true}}),
      );
      const pageManager = await PageManager.from(page);
      await connectWithUser(pageManager, userB);
      const {pages} = pageManager.webapp;
      const sourceFolderName = 'Bulk move recovery folder';
      const sharedDrive = pages.cellsSharedDrive();

      await createGroup(pages, conversationName, [userB], {cells: true});
      await pages.conversationList().getConversation(conversationName).open();
      await pages.conversation().clickFilesTab();
      await sharedDrive.createFolder(sourceFolderName);
      await expect(async () => {
        await sharedDrive.refresh();
        await expect(sharedDrive.getFolder(sourceFolderName)).toBeVisible({timeout: 2_000});
      }).toPass({intervals: [1_000, 2_000, 5_000], timeout: 20_000});
      await sharedDrive.openFolder(sourceFolderName);
      await sharedDrive.uploadFile(getTextFilePath());
      await expect(sharedDrive.uploadStatusHeader).toContainText(`Uploaded ${TextFileName}`);
      await expect(async () => {
        await sharedDrive.refresh();
        await expect(sharedDrive.getFile(TextFileName)).toBeVisible({timeout: 2_000});
      }).toPass({intervals: [1_000, 2_000, 5_000], timeout: 20_000});

      let moveRequestCount = 0;
      await page.route(/\/n\/action\/move(?:\?.*)?$/, async route => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }

        moveRequestCount += 1;
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({message: 'Move failed'}),
        });
      });

      const selection = page.getByRole('checkbox', {name: `Select ${TextFileName}`});
      await selection.focus();
      await selection.press('Space');
      await expect(selection).toBeChecked();
      await page.getByRole('button', {name: 'Move', exact: true}).click();
      const preview = page.getByRole('dialog');
      await expect(preview).toBeVisible();
      await preview.getByRole('button', {name: `${conversationName} files`}).click();
      await expect(preview.getByRole('button', {name: 'Move', exact: true})).toBeEnabled();
      await preview.getByRole('button', {name: 'Move', exact: true}).click();

      await expect(preview.getByRole('alert')).toBeVisible();
      await expect(preview.getByRole('button', {name: 'Refresh Drive'})).toBeVisible();
      await expect(preview.getByRole('button', {name: 'Move', exact: true})).toBeDisabled();
      await expect
        .poll(() => {
          return moveRequestCount;
        })
        .toBe(1);

      await preview.getByRole('button', {name: 'Refresh Drive'}).click();
      await expect(preview).not.toBeVisible();
      await expect(selection).toBeEnabled();
      await expect(selection).not.toBeChecked();
      expect(moveRequestCount).toBe(1);
    },
  );

  test(
    'Searching files in a group conversation',
    {tag: ['@crit-flow-cells', '@regression', '@TC-8788']},
    async ({createPage}) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))),
        PageManager.from(createPage(withLogin(userB))),
      ]);
      await connectWithUser(userAPageManager, userB);

      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;

      await test.step('Preconditions: Create group with drive enabled', async () => {
        await createGroup(userAPages, conversationName, [userB], {cells: true});
      });

      await test.step('User A sends a message with assets in a group conversation', async () => {
        await userAPages.conversationList().getConversation(conversationName).open();
        await userAComponents.inputBarControls().clickShareFile(imageFilePath);
        await userAComponents.inputBarControls().clickShareFile(videoFilePath);
        await userAComponents.inputBarControls().clickSendMessage();
        await userBPages.conversationList().getConversation(conversationName).open();

        await expect(getImageInMultipartMessageLocator(userBPages.conversation(), userA)).toBeVisible();
        await expect(getVideoInMultipartMessageLocator(userBPages.conversation(), userA)).toBeVisible();
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
