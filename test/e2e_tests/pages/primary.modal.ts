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

export class PrimaryModal {
  readonly page: Page;

  readonly primaryModal: Locator;
  readonly passwordInput: Locator;
  readonly primaryButton: Locator;
  readonly secondaryButton: Locator;
  readonly checkbox: Locator;

  constructor(page: Page) {
    this.page = page;

    this.primaryModal = page.locator('[data-uie-name="modal-template-password-advance"]');
    this.passwordInput = this.primaryModal.locator('[data-uie-name="backup-password"]');
    this.primaryButton = this.primaryModal.locator('[data-uie-name="do-action"]');
    this.secondaryButton = this.primaryModal.locator('[data-uie-name="do-secondary"]');
    this.checkbox = this.primaryModal.locator('[data-uie-name="modal-option-checkbox"]');
  }

  async isVisible() {
    await this.primaryModal.waitFor({state: 'visible'});
    return await this.primaryModal.isVisible();
  }

  async enterPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickPrimaryButton() {
    await this.primaryButton.click();
  }

  async clickSecondaryButton() {
    await this.secondaryButton.click();
  }

  async toggleCheckbox() {
    await this.checkbox.click();
  }
}
