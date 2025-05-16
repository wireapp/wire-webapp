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

export class DataShareConsentModal {
  readonly page: Page;

  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly modalText: Locator;
  readonly actionButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.locator("[data-uie-name='modal-template-confirm']");
    this.modalTitle = this.modal.locator("[data-uie-name='status-modal-title']");
    this.modalText = this.modal.locator("[data-uie-name='status-modal-text']");
    this.actionButton = this.modal.locator("[data-uie-name='do-action']");
    this.cancelButton = this.modal.locator("[data-uie-name='do-secondary']");
  }

  async isModalPresent(): Promise<boolean> {
    const modalLocator = this.page.locator(
      "[aria-label='Consent to share user data'], [aria-label='Einwilligung zum Teilen von Nutzungsdaten']",
    );
    return await modalLocator
      .first()
      .isVisible({timeout: 1000})
      .catch(() => false);
  }

  async getModalTitle(): Promise<string> {
    return (await this.modalTitle.textContent()) ?? '';
  }

  async getModalText(): Promise<string> {
    return (await this.modalText.textContent()) ?? '';
  }

  async isActionButtonVisible(): Promise<boolean> {
    try {
      return await this.actionButton.isVisible({timeout: 1000});
    } catch {
      return false;
    }
  }

  async clickDecline(): Promise<void> {
    await this.cancelButton.click();
  }

  async clickConfirm(): Promise<void> {
    await this.actionButton.click();
  }
}
