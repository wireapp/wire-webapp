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
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {Locator} from '@playwright/test';
import {Buffer} from 'node:buffer';

import {
  AudioFileName,
  getAudioFilePath,
  getTextFilePath,
  readLocalFile,
  TextFileName,
} from 'test/e2e_tests/utils/asset.util';
import {sharedDriveDirectUploadFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {PageManager} from 'test/e2e_tests/pageManager';

import {test, expect, withLogin} from '../../test.fixtures';
import {connectWithUser, createGroup, sendConnectionRequest} from '../../utils/userActions';

interface DragAndDropOptions {
  buffer: Buffer;
  fileName: string;
}

const dragAndDropFile = async (locator: Locator, {buffer, fileName}: DragAndDropOptions): Promise<void> => {
  const dataTransfer = await locator.evaluateHandle(
    (_, {buffer, fileName}) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File([Uint8Array.from(buffer)], fileName, {type: 'text/plain'}));
      return dataTransfer;
    },
    {buffer: Array.from(buffer), fileName},
  );

  await locator.dispatchEvent('drop', {dataTransfer});
};

test.describe('Drive file uploads with direct upload disabled', () => {
  let pageManager: PageManager;

  test.beforeEach(async ({createTeam, createPage, createUser}) => {
    const teamMember = await createUser();
    const team = await createTeam('Drive upload team', {
      users: [teamMember],
      features: {cells: true},
    });
    pageManager = await PageManager.from(
      createPage(
        withLogin(team.owner, {
          startupFeatureToggles: {
            [sharedDriveDirectUploadFeatureToggleName]: false,
          },
        }),
      ),
    );
    const {pages} = pageManager.webapp;

    await connectWithUser(pageManager, teamMember);
    await createGroup(pages, 'Drive upload conversation', [teamMember], {cells: true});
    await pages.conversationList().getConversation('Drive upload conversation').open();
    await pages.conversation().clickFilesTab();
    await expect(pages.cellsSharedDrive().newButton).toBeVisible();
  });

  test('does not expose file upload', {tag: ['@functional', '@crit-flow-web']}, async () => {
    const sharedDrive = pageManager.webapp.pages.cellsSharedDrive();

    await sharedDrive.newButton.click();
    await expect(sharedDrive.uploadFileMenuItem).not.toBeVisible();
  });
});

test.describe('Drive file uploads', () => {
  let pageManager: PageManager;
  const targetFolderName = 'Temporary upload folder';
  const conversationName = 'Drive upload conversation';

  test.beforeEach(async ({createTeam, createPage, createUser}) => {
    const teamMember = await createUser();
    const team = await createTeam('Drive upload team', {
      users: [teamMember],
      features: {cells: true},
    });
    pageManager = await PageManager.from(
      createPage(
        withLogin(team.owner, {
          startupFeatureToggles: {
            [sharedDriveDirectUploadFeatureToggleName]: true,
          },
        }),
      ),
    );
    const {pages} = pageManager.webapp;

    await test.step('Preconditions: Create and open a conversation with Shared Drive enabled', async () => {
      await connectWithUser(pageManager, teamMember);
      await createGroup(pages, conversationName, [teamMember], {cells: true});
      await pages.conversationList().getConversation(conversationName).open();
      await pages.conversation().clickFilesTab();
      await expect(pages.cellsSharedDrive().newButton).toBeVisible();
    });
  });

  test('I want to upload a single file to Drive', {tag: ['@TC-12131', '@functional', '@crit-flow-web']}, async () => {
    const {pages} = pageManager.webapp;
    const sharedDrive = pages.cellsSharedDrive();

    await test.step('User uploads one file', async () => {
      await sharedDrive.uploadFile(getTextFilePath());
    });

    await test.step('Uploaded file is visible in Drive', async () => {
      await expect(sharedDrive.uploadStatusHeader).toContainText(`Uploaded ${TextFileName}`);

      await expect(async () => {
        await sharedDrive.refresh();
        await expect(sharedDrive.getFile(TextFileName)).toBeVisible({timeout: 2_000});
      }).toPass({intervals: [1_000, 2_000, 5_000], timeout: 20_000});
    });
  });

  test(
    'I want to upload a duplicate file to Drive and have it renamed',
    {tag: ['@TC-12140', '@regression']},
    async () => {
      const {pages} = pageManager.webapp;
      const sharedDrive = pages.cellsSharedDrive();
      const renamedTextFileName = 'example-1.txt';

      await test.step('User uploads the same file twice', async () => {
        await sharedDrive.uploadFile(getTextFilePath());
        await expect(sharedDrive.uploadStatusHeader).toContainText(`Uploaded ${TextFileName}`);

        await sharedDrive.uploadFile(getTextFilePath());
        await expect(sharedDrive.uploadStatusHeader).toContainText(`Uploaded ${TextFileName}`);
      });

      await test.step('Both files are available and the duplicate is renamed', async () => {
        await expect(async () => {
          await sharedDrive.refresh();
          await expect(sharedDrive.getFile(TextFileName)).toBeVisible({timeout: 2_000});
          await expect(sharedDrive.getFile(renamedTextFileName)).toBeVisible({timeout: 2_000});
          await expect(sharedDrive.filesList.getByRole('button', {name: TextFileName, exact: true})).toHaveCount(1);
        }).toPass({intervals: [1_000, 2_000, 5_000], timeout: 20_000});
      });
    },
  );

  test('I want to upload multiple files to Drive', {tag: ['@TC-12133', '@functional', '@crit-flow-web']}, async () => {
    const {pages} = pageManager.webapp;
    const sharedDrive = pages.cellsSharedDrive();

    await test.step('User uploads multiple files', async () => {
      await sharedDrive.uploadFile([getTextFilePath(), getAudioFilePath()]);
    });

    await test.step('Uploaded files are visible in Drive', async () => {
      await expect(sharedDrive.uploadStatusHeader.getByRole('status')).toContainText('Uploaded 2 items');

      await expect(async () => {
        await sharedDrive.refresh();
        await expect(sharedDrive.getFile(TextFileName)).toBeVisible({timeout: 2_000});
        await expect(sharedDrive.getFile(AudioFileName)).toBeVisible({timeout: 2_000});
      }).toPass({intervals: [1_000, 2_000, 5_000], timeout: 20_000});
    });
  });

  test(
    'I want to upload a file into a Shared Drive folder using New',
    {tag: ['@TC-12135', '@functional', '@crit-flow-web']},
    async () => {
      const {pages} = pageManager.webapp;
      const sharedDrive = pages.cellsSharedDrive();
      const conversation = pages.conversation();
      const initialMessageCount = await conversation.messages.count();

      await test.step('User opens the temporary target folder', async () => {
        await sharedDrive.createFolder(targetFolderName);

        await expect(async () => {
          await sharedDrive.refresh();
          await expect(sharedDrive.getFolder(targetFolderName)).toBeVisible();
        }).toPass({intervals: [1_000, 2_000, 5_000], timeout: 20_000});

        await sharedDrive.openFolder(targetFolderName);
        await expect(sharedDrive.newButton).toBeVisible();
      });

      await test.step('New menu contains Upload file and the file is selected', async () => {
        await sharedDrive.openNewMenu();
        await expect(sharedDrive.uploadFileMenuItem).toBeVisible();
        await sharedDrive.uploadFileFromOpenMenu(getTextFilePath());
      });

      await test.step('File upload completes in the target folder', async () => {
        await expect(sharedDrive.uploadStatusHeader).toContainText(`Uploaded ${TextFileName}`);
        await expect(async () => {
          await sharedDrive.refresh();
          await expect(sharedDrive.getFile(TextFileName)).toBeVisible({timeout: 2_000});
        }).toPass({intervals: [1_000, 2_000, 5_000], timeout: 20_000});
      });

      await test.step('File is not uploaded to the Shared Drive root or sent as a message', async () => {
        await sharedDrive.openRoot(conversationName);
        await expect(async () => {
          await sharedDrive.refresh();
          await expect(sharedDrive.getFile(TextFileName)).toHaveCount(0);
        }).toPass({intervals: [1_000, 2_000, 5_000], timeout: 20_000});
        await conversation.clickMessagesTab();
        await expect(conversation.messages).toHaveCount(initialMessageCount);
      });
    },
  );
});

test.describe('Drive file uploads for viewers', () => {
  test(
    'User without upload permission cannot start an upload',
    {tag: ['@TC-12141', '@regression']},
    async ({createPage, createTeam, createUser}) => {
      const guestUser = await createUser();
      const team = await createTeam('Drive viewer team', {features: {cells: true}});
      const conversationName = 'Drive viewer conversation';

      const [ownerPage, guestPage] = await Promise.all([
        createPage(
          withLogin(team.owner, {
            startupFeatureToggles: {[sharedDriveDirectUploadFeatureToggleName]: true},
          }),
        ),
        createPage(
          withLogin(guestUser, {
            startupFeatureToggles: {[sharedDriveDirectUploadFeatureToggleName]: true},
          }),
        ),
      ]);
      const ownerPageManager = PageManager.from(ownerPage);
      const guestPageManager = PageManager.from(guestPage);
      const ownerPages = ownerPageManager.webapp.pages;
      const guestPages = guestPageManager.webapp.pages;

      await test.step('Preconditions: Connect the viewer and create a Shared Drive conversation', async () => {
        await sendConnectionRequest(ownerPage, guestUser);
        await guestPages.conversationList().openPendingConnectionRequest();
        await guestPages.connectRequest().clickConnectButton();

        await createGroup(ownerPages, conversationName, [guestUser], {cells: true});
        await ownerPages.conversationList().getConversation(conversationName).open();
        await ownerPages.conversation().clickFilesTab();
        await expect(ownerPages.cellsSharedDrive().newButton).toBeVisible();
      });

      await test.step('Precondition: Add a file that the viewer can see', async () => {
        const ownerSharedDrive = ownerPages.cellsSharedDrive();
        await ownerSharedDrive.uploadFile(getTextFilePath());
        await expect(ownerSharedDrive.uploadStatusHeader).toContainText(`Uploaded ${TextFileName}`);
        await expect(async () => {
          await ownerSharedDrive.refresh();
          await expect(ownerSharedDrive.getFile(TextFileName)).toBeVisible({timeout: 2_000});
        }).toPass({intervals: [1_000, 2_000, 5_000], timeout: 20_000});
      });

      await test.step('Viewer can open the Shared Drive and view its contents', async () => {
        await guestPages.conversationList().getConversation(conversationName).open();
        await guestPages.conversation().clickFilesTab();

        const guestSharedDrive = guestPages.cellsSharedDrive();
        await expect(guestSharedDrive.getFile(TextFileName)).toBeVisible();
        await expect(guestSharedDrive.newButton).not.toBeVisible();
        await expect(guestSharedDrive.uploadFileMenuItem).not.toBeVisible();
      });

      await test.step('Viewer cannot upload through drag and drop', async () => {
        const guestSharedDrive = guestPages.cellsSharedDrive();
        const draggedFileName = 'viewer-upload-attempt.txt';

        await dragAndDropFile(guestSharedDrive.filesList.first(), {
          buffer: await readLocalFile(getTextFilePath()),
          fileName: draggedFileName,
        });

        await expect(guestSharedDrive.getFile(draggedFileName)).toHaveCount(0);
      });
    },
  );
});
