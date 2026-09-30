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

import {PageManager} from 'test/e2e_tests/pageManager';
import {getTextFilePath, TextFileName} from 'test/e2e_tests/utils/asset.util';

import {test, expect, withLogin} from '../../test.fixtures';

test.describe('Drive file uploads', () => {
  test(
    'I want to upload a single file to Drive',
    {tag: ['@TC-12131', '@functional']},
    async ({createTeam, createPage}) => {
      const team = await createTeam('Drive upload team', {features: {cells: true}});
      const pageManager = await PageManager.from(createPage(withLogin(team.owner)));
      const {page} = pageManager;

      await test.step('User opens Drive', async () => {
        await pageManager.webapp.pages.sidebar().clickCellsButton();
        await expect(page.getByRole('button', {name: 'New', exact: true})).toBeVisible();
      });

      await test.step('User uploads one file', async () => {
        await page.locator('input[type="file"]').first().setInputFiles(getTextFilePath());
      });

      await test.step('Uploaded file is visible in Drive', async () => {
        const uploadedFile = page
          .locator('[data-uie-name="cells-table-row"]')
          .getByRole('button', {name: TextFileName, exact: true});

        await expect(uploadedFile).toBeVisible();
      });
    },
  );
});
