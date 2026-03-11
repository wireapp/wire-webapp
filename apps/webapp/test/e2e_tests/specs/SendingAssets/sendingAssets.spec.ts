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

import {test, expect, withConnectedUser, withLogin, Team} from 'test/e2e_tests/test.fixtures';
import {getTextFilePath, readLocalFile, TextFileName} from 'test/e2e_tests/utils/asset.util';
import {Page} from 'playwright/test';

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

test.describe('Sending Assents', () => {
  let team: Team;
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    team = await createTeam('Test Team', {users: [userB]});
    userA = team.owner;
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
});
