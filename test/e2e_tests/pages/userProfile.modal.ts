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

export class UserProfileModal {
  readonly page: Page;

  readonly modal: Locator;
  readonly connectButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[data-uie-name="modal-user-profile"]');
    this.connectButton = page.locator('[data-uie-name="modal-user-profile"] [data-uie-name="do-send-request"]');
  }

  async isVisible() {
    await this.modal.isVisible();
  }

  async clickConnectButton() {
    await this.connectButton.click();
  }
}
