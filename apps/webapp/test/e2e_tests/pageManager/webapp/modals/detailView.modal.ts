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

export class DetailViewModal {
  readonly page: Page;

  readonly mainWindow: Locator;
  readonly image: Locator;
  readonly downloadButton: Locator;
  readonly plusOneButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.mainWindow = page.locator('#detail-view');
    this.image = this.mainWindow.locator(`img`);
    this.plusOneButton = this.mainWindow.locator(`footer button${selectByDataAttribute('reactwith-thumbsup-messag')}`);
    this.downloadButton = this.mainWindow.locator(
      `footer button${selectByDataAttribute('do-download-fullscreen-picture')}`,
    );
    this.closeButton = this.mainWindow.locator(`header button${selectByDataAttribute('do-close-detail-view')}`);
  }

  async waitForVisibility() {
    await this.mainWindow.waitFor({state: 'visible'});
  }

  async isVisible() {
    return await this.mainWindow.isVisible();
  }

  async isImageVisible() {
    return await this.image.isVisible();
  }

  async getImageScreenshot() {
    return await this.image.screenshot();
  }

  async givePlusOneReaction() {
    await this.plusOneButton.click();
  }

  async closeModal() {
    await this.closeButton.click();
  }

  async downloadAsset() {
    return await downloadAssetAndGetFilePath(this.page, this.downloadButton);
  }
}
