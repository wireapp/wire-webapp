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

import {selectByDataAttribute, selectByLabel} from 'test/e2e_tests/utils/useSelector';

export class LeaveConversationModal {
  readonly page: Page;

  readonly modal: Locator;
  readonly modalCheckbox: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.locator(selectByDataAttribute('modal-template-option'));
    this.modalCheckbox = this.modal.locator(selectByLabel('clear-data-checkbox'));
    this.cancelButton = this.modal.locator(selectByDataAttribute('do-secondary'));
    this.confirmButton = this.modal.locator(selectByDataAttribute('do-action'));
  }

  async toggleCheckbox() {
    await this.modalCheckbox.click();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async clickConfirm() {
    await this.confirmButton.click();
  }
}
