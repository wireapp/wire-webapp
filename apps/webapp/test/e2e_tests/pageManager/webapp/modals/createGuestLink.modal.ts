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

export class CreatGuestLinkModal {
  readonly page: Page;

  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly modalText: Locator;
  readonly guestLinkPasswordInput: Locator;
  readonly guestLinkPasswordConfirmInput: Locator;
  readonly createLinkButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.locator("[data-uie-name='primary-modals-container']");
    this.modalTitle = this.modal.locator('#modal-title');
    this.modalText = this.modal.locator('#modal-description-text');
    this.guestLinkPasswordInput = this.modal.locator("[data-uie-name='guest-link-password']");
    this.guestLinkPasswordConfirmInput = this.modal.locator("[data-uie-name='guest-link-password-confirm']");
    this.createLinkButton = this.modal.locator("[data-uie-name='do-action']");
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

  async setGuestLinkPassword(password: string) {
    await this.guestLinkPasswordInput.fill(password);
    await this.guestLinkPasswordConfirmInput.fill(password);
    await this.createLinkButton.click();
  }
}
