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

import {selectByDataAttribute} from 'test/e2e_tests/utils/selector.util';

export class ExportBackupModal {
  readonly page: Page;

  readonly exportBackupModal: Locator;
  readonly title: Locator;
  readonly primaryButton: Locator;
  readonly secondaryButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.exportBackupModal = page.locator(selectByDataAttribute('primary-modals-container'));
    this.title = this.exportBackupModal.locator(selectByDataAttribute('status-modal-title'));
    this.primaryButton = this.exportBackupModal.locator(selectByDataAttribute('do-action'));
    this.secondaryButton = this.exportBackupModal.locator(selectByDataAttribute('do-secondary'));
  }

  async isTitleVisible() {
    await this.title.waitFor({state: 'visible'});
  }

  async isTitleHidden() {
    await this.title.waitFor({state: 'hidden'});
  }

  async clickPrimaryButton() {
    await this.primaryButton.click();
  }

  async clickSecondaryButton() {
    await this.secondaryButton.click();
  }
}
