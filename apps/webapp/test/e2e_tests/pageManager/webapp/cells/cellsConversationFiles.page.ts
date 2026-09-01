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

import {Locator, Page} from '@playwright/test';

export class CellsConversationFilesPage {
  filesList: Locator;
  readonly searchInput: Locator;
  readonly newButton: Locator;
  readonly uploadFileMenuItem: Locator;
  readonly uploadInput: Locator;

  constructor(page: Page) {
    const sharedDrive = page.getByRole('tabpanel', {name: 'Shared Drive'});

    this.filesList = sharedDrive.locator('table td[data-cell="Name"]');
    this.searchInput = sharedDrive.getByRole('textbox', {name: 'Search files and folders'});
    this.newButton = sharedDrive.getByRole('button', {name: 'New'});
    this.uploadFileMenuItem = page.getByRole('menuitem', {name: 'Upload file'});
    this.uploadInput = sharedDrive.locator('input[type="file"]');
  }

  async searchFile(fileName: string) {
    await this.searchInput.clear();
    await this.searchInput.fill(fileName);
  }

  async uploadFile(filePath: string) {
    await this.newButton.click();
    await this.uploadFileMenuItem.click();
    await this.uploadInput.setInputFiles(filePath);
  }

  getFile(fileName: string) {
    return this.filesList.getByRole('button', {name: fileName});
  }
}
