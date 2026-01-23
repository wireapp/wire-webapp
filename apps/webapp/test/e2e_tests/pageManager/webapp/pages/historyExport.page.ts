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
import {downloadAssetAndGetFilePath} from 'test/e2e_tests/utils/asset.util';
import {selectByDataAttribute} from 'test/e2e_tests/utils/selector.util';

export class HistoryExportPage {
  readonly page: Page;

  readonly exportSuccessHeadline: Locator;
  readonly saveFileButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.exportSuccessHeadline = page.locator(selectByDataAttribute('status-history-export-success-headline'));
    this.saveFileButton = page.locator(selectByDataAttribute('do-save-history-export'));
    this.cancelButton = page.locator(selectByDataAttribute('do-cancel-history-export'));
  }

  async isVisible() {
    await this.exportSuccessHeadline.waitFor({state: 'visible'});
    return await this.exportSuccessHeadline.isVisible();
  }

  async clickSaveFileButton() {
    await this.saveFileButton.click();
  }
  async clickCancelButton() {
    await this.cancelButton.click();
  }

  async downloadFile() {
    return await downloadAssetAndGetFilePath(this.page, this.saveFileButton);
  }
}
