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

import {type Locator, type Page} from '@playwright/test';

import {shareAssetHelper} from '../../../utils/asset.util';

export class CellsSharedDrivePage {
  private readonly page: Page;
  readonly filesList: Locator;
  readonly newButton: Locator;
  readonly refreshButton: Locator;
  readonly uploadFileMenuItem: Locator;
  readonly uploadStatusHeader: Locator;

  constructor(page: Page) {
    this.page = page;
    this.filesList = page.locator('table td[data-cell="Name"]');
    this.newButton = page.getByRole('button', {name: 'New', exact: true});
    this.refreshButton = page.getByRole('button', {name: 'Refresh list', exact: true});
    this.uploadFileMenuItem = page.getByRole('menuitem', {name: 'Upload file', exact: true});
    this.uploadStatusHeader = page.getByTestId('shared-drive-upload-status-header');
  }

  getFile(fileName: string) {
    return this.filesList.getByRole('button', {name: fileName, exact: true});
  }

  async uploadFile(filePath: string | readonly string[]) {
    await this.newButton.click();
    await this.uploadFileMenuItem.waitFor({state: 'visible'});
    await shareAssetHelper(filePath, this.page, this.uploadFileMenuItem);
  }

  async refresh() {
    await this.refreshButton.click();
  }
}
