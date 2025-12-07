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

export class UnableToOpenConversationModal {
  readonly page: Page;

  readonly modal: Locator;
  readonly acknowledgeButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.locator(
      `${selectByDataAttribute('primary-modals-container')}[aria-label='Wire can’t open this conversation.']`,
    );
    this.acknowledgeButton = this.modal.locator(`${selectByDataAttribute('do-action')}`);
  }

  async isModalPresent() {
    return this.modal.isVisible();
  }

  async isActionButtonVisible() {
    return await this.acknowledgeButton.isVisible();
  }

  async clickAcknowledge() {
    await this.acknowledgeButton.isVisible();
    await this.acknowledgeButton.click();
  }
}
