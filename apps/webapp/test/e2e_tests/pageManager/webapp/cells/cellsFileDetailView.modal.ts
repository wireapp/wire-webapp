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

export class CellsFileDetailViewModal {
  readonly page: Page;
  readonly closeButton: Locator;
  readonly downloadButton: Locator;
  readonly image: Locator;

  constructor(page: Page) {
    this.page = page;
    this.closeButton = page.locator("[aria-label='Close']");
    this.downloadButton = page.locator("[aria-label='Download']");
    this.image = page.locator("[role='dialog'][aria-modal='true'] img");
  }

  async isImageVisible() {
    await this.image.waitFor({state: 'visible'});
    return await this.image.isVisible();
  }

  async closeModal() {
    await this.closeButton.click();
  }

  async downloadAsset() {
    await this.downloadButton.waitFor({state: 'visible'});
    return await downloadAssetAndGetFilePath(this.page, this.downloadButton);
  }
}
