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

export class OutgoingConnectionPage {
  readonly page: Page;

  readonly uniqueUsernameOutgoing: Locator;

  constructor(page: Page) {
    this.page = page;

    this.uniqueUsernameOutgoing = this.page.locator('.message-connected-username.label-username');
  }

  async getOutgoingConnectionUsername() {
    return this.uniqueUsernameOutgoing.textContent();
  }

  async isPendingIconVisible(fullName: string) {
    return await this.page
      .locator(`[data-uie-name='item-conversation'][data-uie-value='${fullName}'] [data-uie-name='status-pending']`)
      .isVisible();
  }

  async isPendingIconHidden(fullName: string) {
    return await this.page
      .locator(`[data-uie-name='item-conversation'][data-uie-value='${fullName}'] [data-uie-name='status-pending']`)
      .waitFor({state: 'hidden'});
  }
}
