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

export class BaseModal {
  readonly page: Page;

  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly modalText: Locator;
  readonly blockButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.locator("[data-uie-name='primary-modals-container']");
    this.modalTitle = this.modal.locator("[data-uie-name='status-modal-title']");
    this.modalText = this.modal.locator("[data-uie-name='status-modal-text']");
    this.blockButton = this.modal.locator("[data-uie-name='do-action']");
    this.cancelButton = this.modal.locator("[data-uie-name='do-secondary']");
  }

  async isModalPresent() {
    return await this.modal.isVisible();
  }

  async getModalTitle() {
    return (await this.modalTitle.textContent()) ?? '';
  }

  async getModalText() {
    return (await this.modalText.textContent()) ?? '';
  }

  async isBlockButtonVisible() {
    return await this.blockButton.isVisible();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async clickBlock() {
    await this.blockButton.click();
  }
}
