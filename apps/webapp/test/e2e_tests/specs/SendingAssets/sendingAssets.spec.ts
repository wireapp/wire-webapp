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
import {
  getAudioFilePath,
  getTextFilePath,
  readLocalFile,
  shareAssetHelper,
  TextFileName,
} from 'test/e2e_tests/utils/asset.util';
import {Page} from 'playwright/test';
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

async function dragAndDropFiles(
  page: Page,
  selector: string,
  {buffer, fileName, count = 1}: DragAndDropOptions,
): Promise<void> {
  const dataTransfer = await page.evaluateHandle(
    ({buffer, fileName, count}) => {
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

  await page.dispatchEvent(selector, 'dragenter', {dataTransfer});
  await page.dispatchEvent(selector, 'dragover', {dataTransfer});
  await page.dispatchEvent(selector, 'drop', {dataTransfer});
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
    const [userBPage] = await Promise.all([
      createPage(withLogin(userB), withConnectedUser(userA)),
      createPage(withLogin(userA)),
    ]);

    const {pages} = PageManager.from(userBPage).webapp;

    await pages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await shareAssetHelper(getAudioFilePath(), userBPage, userBPage.getByRole('button', {name: 'Add file'}));

    const message = pages.conversation().getMessage({sender: userB});
    await expect(message).toBeVisible();
    await pages.conversation().deleteMessage(message, 'Everyone');
    await expect(message).not.toBeVisible();
  });

  test('I want to drag & drop a file into a conversation', {tag: ['@TC-497', '@regression']}, async ({createPage}) => {
    const [userBPage] = await Promise.all([
      createPage(withLogin(userB), withConnectedUser(userA)),
      createPage(withLogin(userA)),
    ]);

    const {pages, modals} = PageManager.from(userBPage).webapp;

    const buffer = await readLocalFile(getTextFilePath());
    const targetSelector = '#conversation-input-bar';

    await test.step('Go to any 1:1 conversation', async () => {
      await pages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    });

    await test.step('User B can drag & drop a file into a conversation', async () => {
      await dragAndDropFiles(userBPage, targetSelector, {
        buffer,
        fileName: TextFileName,
      });
      await expect(pages.conversation().getMessage({sender: userB})).toBeVisible();
      await expect(pages.conversation().getMessage({sender: userB})).toHaveCount(1);
    });

    await test.step('Verify User B sees an error message when he drops 11 files', async () => {
      await dragAndDropFiles(userBPage, targetSelector, {
        buffer,
        fileName: TextFileName,
        count: 11,
      });

      await expect(modals.acknowledge().modalTitle).toContainText(`Too many files at once`);
      await modals.acknowledge().clickAction();
      await expect(pages.conversation().getMessage({sender: userB})).toHaveCount(1);
    });
  });

  test(
    'I want to copy & paste an image into a conversation',
    {tag: ['@TC-498', '@regression']},
    async ({createPage}) => {
      const [userBPage] = await Promise.all([
        createPage(withLogin(userB), withConnectedUser(userA)),
        createPage(withLogin(userA)),
      ]);

      const {pages} = PageManager.from(userBPage).webapp;

      const buffer = await readLocalFile(getImageFilePath());
      const targetSelector = '#conversation-input-bar';

      const pasteImage = async (page: Page, selector: string, buffer: Buffer, fileName: string): Promise<void> => {
        await page.evaluateHandle(
          ({bufferArray, name, selector}) => {
            const target = document.querySelector(selector);
            if (!target) throw new Error(`Target ${selector} not found`);

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
          {bufferArray: Array.from(buffer), name: fileName, selector},
        );
      };

      const pastedFileControls = userBPage.getByTestId('pasted-file-controls');
      await test.step('Go to any 1:1 conversation', async () => {
        await pages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      });

      await test.step('User B copy paste image into the conversation', async () => {
        await pages.conversation().messageInput.click();
        await pasteImage(userBPage, targetSelector, buffer, ImageQRCodeFileName);
        await expect(pastedFileControls).toContainText('Pasted image');
        await expect(pastedFileControls.getByRole('button', {name: 'Close'})).toBeVisible();
        await expect(pastedFileControls.getByRole('img')).toBeVisible();
      });

      await test.step('User B send message and verify it in message', async () => {
        await pastedFileControls.press('Enter');
        await expect(pages.conversation().getMessage({sender: userB}).getByRole('img')).toBeVisible();
      });
    },
  );

  test('I want to copy message via message option menu', {tag: ['@TC-500', '@regression']}, async ({createPage}) => {
    const [userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      createPage(withLogin(userA)),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userBPages.conversation().sendMessage('Message to copy');

    const message = userBPages.conversation().getMessage({sender: userB});
    await expect(message).toBeVisible();

    const messageOptions = await userBPages.conversation().openMessageOptions(message);
    await messageOptions.getByRole('button', {name: 'Copy'}).click();
    const isMac = process.platform === 'darwin';

    await userBPages.conversation().messageInput.press(isMac ? 'Meta+V' : 'Control+V');
    await expect(userBPages.conversation().messageInput).toContainText('Message to copy');
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
});
