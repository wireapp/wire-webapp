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

export class UserProfileModal {
  readonly page: Page;

  readonly modal: Locator;
  readonly connectButton: Locator;
  readonly startConversationButton: Locator;
  readonly unblockButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator(`${selectByDataAttribute('modal-user-profile')}`);
    this.connectButton = page.locator(
      `${selectByDataAttribute('modal-user-profile')} ${selectByDataAttribute('do-send-request')}`,
    );
    this.startConversationButton = page.locator(
      `${selectByDataAttribute('modal-user-profile')} ${selectByDataAttribute('start-conversation')}`,
    );
    this.unblockButton = page.locator(
      `${selectByDataAttribute('modal-user-profile')} ${selectByDataAttribute('do-unblock')}`,
    );
  }

  async isVisible() {
    return await this.modal.isVisible();
  }

  async clickConnectButton() {
    await this.connectButton.click();
  }

  async clickStartConversation() {
    await this.startConversationButton.click();
  }
}
