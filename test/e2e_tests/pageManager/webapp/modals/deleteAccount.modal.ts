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

import {Page, Locator} from '@playwright/test';

export class DeleteAccountModal {
  readonly page: Page;

  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly modalText: Locator;
  readonly deleteButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.getByRole('dialog').getByRole('button').nth(0);
    this.modalTitle = this.modal.getByRole('heading', {level: 2});
    this.modalText = this.modal.getByRole('paragraph').nth(0);
    this.deleteButton = this.modal.getByRole('button', {name: 'Delete'});
    this.cancelButton = this.modal.getByRole('button', {name: 'Cancel'});
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

  async isDeleteButtonVisible() {
    return await this.deleteButton.isVisible();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async clickDelete() {
    await this.deleteButton.click();
  }
}
