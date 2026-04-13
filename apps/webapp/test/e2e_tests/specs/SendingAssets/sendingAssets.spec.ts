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

import {test, expect, withConnectedUser, withLogin} from 'test/e2e_tests/test.fixtures';
import {getAudioFilePath, getTextFilePath, shareAssetHelper, TextFileName} from 'test/e2e_tests/utils/asset.util';
import {Locator} from 'playwright/test';
import {getImageFilePath, ImageQRCodeFileName} from 'test/e2e_tests/utils/sendImage.util';
import {Buffer} from 'node:buffer';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createGroup} from 'test/e2e_tests/utils/userActions';

interface DragAndDropOptions {
  buffer: Buffer;
  fileName: string;
  count?: number;
}

async function dragAndDropFiles(locator: Locator, {buffer, fileName, count = 1}: DragAndDropOptions): Promise<void> {
  const dataTransfer = await locator.evaluateHandle(
    (_, {buffer, fileName, count}) => {
      const dt = new DataTransfer();
      const fileBytes = Uint8Array.from(buffer);

      for (let i = 1; i <= count; i++) {
        const name = count > 1 ? fileName.replace('.txt', `${i}.txt`) : fileName;
        const file = new File([fileBytes], name, {type: 'text/plain'});
        dt.items.add(file);
      }
      return dt;
    },
    {buffer: Array.from(buffer), fileName, count},
  );

  await locator.dispatchEvent('drop', {dataTransfer});
}

test.describe('Sending Assets', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createUser, createTeam}) => {
    userB = await createUser();
    const team = await createTeam('Test Team', {users: [userB]});
    userA = team.owner;
  });

  test('Verify you can delete an audio message', {tag: ['@TC-111', '@regression']}, async ({createPage}) => {
    const userAPage = await createPage(withLogin(userA), withConnectedUser(userB));
    const {pages} = PageManager.from(userAPage).webapp;

    await pages.conversationList().openConversation(userB.fullName);
    await shareAssetHelper(getAudioFilePath(), userAPage, userAPage.getByRole('button', {name: 'Add file'}));

    const message = pages.conversation().getMessage({sender: userA});
    await expect(message).toBeVisible();
    await pages.conversation().deleteMessage(message, 'Everyone');
    await expect(message).not.toBeVisible();
  });

  test('I want to drag & drop a file into a conversation', {tag: ['@TC-497', '@regression']}, async ({createPage}) => {
    const userAPage = await createPage(withLogin(userA), withConnectedUser(userB));
    const {pages, modals} = PageManager.from(userAPage).webapp;

    const buffer = await fs.readFile(getTextFilePath());

    await test.step('Go to any 1:1 conversation', async () => {
      await pages.conversationList().openConversation(userB.fullName);
    });

    await test.step('User B can drag & drop a file into a conversation', async () => {
      await dragAndDropFiles(pages.conversation().messageInput, {
        buffer,
        fileName: TextFileName,
      });
      await expect(pages.conversation().getMessage({sender: userA})).toHaveCount(1);
    });

    await test.step('Verify User B sees an error message when he drops 11 files', async () => {
      await dragAndDropFiles(pages.conversation().messageInput, {
        buffer,
        fileName: TextFileName,
        count: 11,
      });

      await expect(modals.acknowledge().modalTitle).toContainText(`Too many files at once`);
      await modals.acknowledge().clickAction();
      await expect(pages.conversation().getMessage({sender: userA})).toHaveCount(1);
    });
  });

  test(
    'I want to copy & paste an image into a conversation',
    {tag: ['@TC-498', '@regression']},
    async ({createPage}) => {
      const userAPage = await createPage(withLogin(userA), withConnectedUser(userB));
      const {pages} = PageManager.from(userAPage).webapp;

      const buffer = await fs.readFile(getImageFilePath());

      const pasteImage = async (locator: Locator, buffer: Buffer, fileName: string): Promise<void> => {
        await locator.evaluateHandle(
          (target, {bufferArray, name}) => {
            const file = new File([Uint8Array.from(bufferArray)], name, {type: 'image/png'});

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            const pasteEvent = new ClipboardEvent('paste', {
              clipboardData: dataTransfer,
              bubbles: true,
              cancelable: true,
            });

            target.dispatchEvent(pasteEvent);
          },
          {bufferArray: Array.from(buffer), name: fileName},
        );
      };

      const pastedFileControls = userAPage.getByTestId('pasted-file-controls');
      await test.step('Go to any 1:1 conversation', async () => {
        await pages.conversationList().openConversation(userB.fullName);
      });

      await test.step('User A copy paste image into the conversation', async () => {
        await pages.conversation().messageInput.click();
        await pasteImage(pages.conversation().messageInput, buffer, ImageQRCodeFileName);
        await expect(pastedFileControls).toContainText('Pasted image');
        await expect(pastedFileControls.getByRole('button', {name: 'Close'})).toBeVisible();
        await expect(pastedFileControls.getByRole('img')).toBeVisible();
      });

      await test.step('User B send message and verify it in message', async () => {
        await pastedFileControls.press('Enter');
        await expect(pages.conversation().getMessage({sender: userA}).getByRole('img')).toBeVisible();
      });
    },
  );

  test('I want to copy message via message option menu', {tag: ['@TC-500', '@regression']}, async ({createPage}) => {
    const userAPage = await createPage(withLogin(userA), withConnectedUser(userB));
    const userAPages = PageManager.from(userAPage).webapp.pages;

    await userAPages.conversationList().openConversation(userB.fullName);
    await userAPages.conversation().sendMessage('Message to copy');

    const message = userAPages.conversation().getMessage({sender: userA});
    await expect(message).toBeVisible();

    const messageOptions = await userAPages.conversation().openMessageOptions(message);
    await messageOptions.getByRole('button', {name: 'Copy'}).click();
    await expect
      .poll(async () => await userAPage.evaluate(() => navigator.clipboard.readText()))
      .toBe('Message to copy');
  });

  [
    {
      tag: ['@TC-764', '@regression'],
      conversationType: '1on1',
    } as const,
    {
      tag: ['@TC-765', '@regression'],
      conversationType: 'group',
    } as const,
  ].forEach(({tag, conversationType}) => {
    test(
      `Verify file can be uploaded and re-downloaded by sender himself in ${conversationType}`,
      {tag: [`${tag}`, '@regression']},
      async ({createPage}, testInfo) => {
        const userAPage = await createPage(withLogin(userA), withConnectedUser(userB));
        const {pages} = PageManager.from(userAPage).webapp;

        const sourcePath = getTextFilePath();
        const {name: fileName, ext: extension, base: fileBase} = path.parse(sourcePath);
        const {size: expectedSize} = await fs.stat(sourcePath);

        await test.step('User A opens the conversation', async () => {
          if (conversationType === '1on1') {
            await pages.conversationList().openConversation(userB.fullName);
          } else {
            await createGroup(pages, 'Test Group', [userB]);
            await pages.conversationList().openConversation('Test Group');
          }
        });

        await test.step('User A sends an appropriate file', async () => {
          await shareAssetHelper(getTextFilePath(), userAPage, userAPage.getByRole('button', {name: 'Add file'}));
          const message = pages.conversation().getMessage({sender: userA});
          await expect(message).toContainText(fileName);
          await expect(message).toContainText(extension.slice(1));
          await expect(message).toContainText(expectedSize.toString());
        });

        await test.step('User A re-downloads file from the conversation', async () => {
          const downloadedPath = await pages.conversation().downloadFile(testInfo.outputDir);
          try {
            const {size: actualSize} = await fs.stat(downloadedPath);
            const {ext: downloadedExtension, base: downloadedName} = path.parse(downloadedPath);
            expect(downloadedName).toBe(fileBase);
            expect(downloadedExtension).toBe(extension);
            expect(actualSize).toBe(expectedSize);
          } finally {
            await fs.rm(downloadedPath);
          }
        });
      },
    );
  });

  test('Verify warning is shown if file size is too big', {tag: ['@TC-767', '@regression']}, async ({createPage}) => {
    const page = await createPage(withLogin(userA), withConnectedUser(userB));
    const {pages, modals} = PageManager.from(page).webapp;
    await createGroup(pages, 'Test Group', [userB]);

    // Verify uploading a file exceeding the limit isn't possible for both, 1on1 and group conversations
    for (const conversation of [userB.fullName, 'Test Group']) {
      await test.step(`Try sending a too big file to ${conversation}`, async () => {
        await pages.conversationList().openConversation(conversation);
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          page.getByRole('button', {name: 'Add file'}).click(),
        ]);

        const tempFilePath = path.join(tmpdir(), '100MB-testfile.tmp');
        try {
          // Create and upload a random generated 101MB file
          await fs.writeFile(tempFilePath, Buffer.allocUnsafe(101 * 2 ** 20));
          await fileChooser.setFiles(tempFilePath);
        } finally {
          await fs.rm(tempFilePath); // Ensure the file get's cleaned up again
        }

        // Verify modal is shown that the file is too large
        await expect(modals.acknowledge().modalTitle).toContainText('File too large');
        await modals.acknowledge().actionButton.click();

        // Ensure the message wasn't sent
        await expect(pages.conversation().getMessage({sender: userA})).not.toBeAttached();
      });
    }
  });

  test('Verify sender is able to cancel upload', {tag: ['@TC-773', '@regression']}, async ({createPage}) => {
    const [userAPage, userBPage] = await Promise.all([
      createPage(withLogin(userA), withConnectedUser(userB)),
      createPage(withLogin(userB)),
    ]);
    const pages = PageManager.from(userAPage).webapp.pages;
    const userBPages = PageManager.from(userBPage).webapp.pages;

    await pages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

    const tempFilePath = path.join(tmpdir(), '25MB-testfile.tmp');
    try {
      await fs.writeFile(tempFilePath, Buffer.allocUnsafe(25 * 2 ** 20));
      await shareAssetHelper(tempFilePath, userAPage, userAPage.getByRole('button', {name: 'Add file'}));
    } finally {
      await fs.rm(tempFilePath);
    }

    const uploadAssetsContainer = userAPage.getByTestId('upload-assets');
    const cancelButton = uploadAssetsContainer.getByRole('button', {name: 'Cancel'});
    await expect(uploadAssetsContainer).toContainText('Uploading…');
    await cancelButton.click();
    // Verify the message wasn't sent
    await expect(pages.conversation().getMessage({sender: userA})).not.toBeAttached();
    await expect(userBPages.conversation().getMessage({sender: userA})).not.toBeAttached();
  });

  test(
    'I should not be able to download files that were manipulated with wrong hash or invalid hash',
    {tag: ['@TC-777', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

      await shareAssetHelper(getTextFilePath(), userAPage, userAPage.getByRole('button', {name: 'Add file'}));

      // Intercept requests to the assets endpoint for userB and return a manipulated response instead
      await userBPage.route('**/assets/**', async route => {
        await route.fulfill({
          body: Buffer.alloc(1), // Create random 1 byte file
        });
      });

      const fileMessage = userBPages.conversation().getMessage({sender: userA});
      await fileMessage.getByRole('button', {name: 'Download'}).click();

      await expect(fileMessage).toContainText('Download failed (hash does not match)', {ignoreCase: true});
    },
  );

  test(
    'I should not be able to download sent files when they are obfuscated',
    {tag: ['@TC-3728', '@regression']},
    async ({createPage}) => {
      const userAPage = await createPage(withLogin(userA), withConnectedUser(userB));
      const {pages} = PageManager.from(userAPage).webapp;

      await pages.conversationList().openConversation(userB.fullName);
      await pages.conversation().enableSelfDeletingMessages();

      await shareAssetHelper(getImageFilePath(), userAPage, userAPage.getByRole('button', {name: 'Add picture'}));
      const message = pages.conversation().getMessage({sender: userA});
      // Confirm the message contains an image
      await expect(message.getByTestId('image-asset-img')).toBeAttached();

      await userAPage.waitForTimeout(11_000);
      await expect(message.getByTestId('image-asset-img')).not.toBeAttached();
      // User A cannot see message option Download
      const messageOptions = await pages.conversation().openMessageOptions(message);
      await expect(messageOptions).not.toContainText('Download');
    },
  );

  test(
    'Verify you can see conversation images in fullscreen',
    {tag: ['@TC-1193', '@regression']},
    async ({createPage}) => {
      const userAPage = await createPage(withLogin(userA), withConnectedUser(userB));
      const {pages, modals} = PageManager.from(userAPage).webapp;

      await pages.conversationList().openConversation(userB.fullName);
      await shareAssetHelper(getImageFilePath(), userAPage, userAPage.getByRole('button', {name: 'Add picture'}));
      await pages.conversation().clickImage(userA);

      await expect(modals.detailViewModal().mainWindow).toBeVisible();
      await expect(modals.detailViewModal().image).toBeVisible();
    },
  );
});
