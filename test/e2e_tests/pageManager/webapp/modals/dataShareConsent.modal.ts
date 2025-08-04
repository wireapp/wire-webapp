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

import {selectByDataAttribute} from 'test/e2e_tests/utils/selector.util';

export class DataShareConsentModal {
  readonly page: Page;

  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly modalText: Locator;
  readonly agreeButton: Locator;
  readonly declineButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.locator(
      `${selectByDataAttribute('primary-modals-container')}[aria-label='Consent to share user data']`,
    );
    this.modalTitle = this.modal.locator(`${selectByDataAttribute('status-modal-title')}`);
    this.modalText = this.modal.locator(`${selectByDataAttribute('status-modal-text')}`);
    this.agreeButton = this.modal.locator(`${selectByDataAttribute('do-action')}`);
    this.declineButton = this.modal.locator(`${selectByDataAttribute('do-secondary')}`);
  }

  async isModalPresent() {
    return this.modal.isVisible();
  }

  async getModalTitle() {
    return (await this.modalTitle.textContent()) ?? '';
  }

  async getModalText() {
    return (await this.modalText.textContent()) ?? '';
  }

  async isActionButtonVisible() {
    return await this.agreeButton.isVisible();
  }

  async clickDecline() {
    await this.declineButton.isVisible();
    await this.declineButton.click();
  }

  async clickConfirm() {
    await this.agreeButton.isVisible();
    await this.agreeButton.click();
  }
}
