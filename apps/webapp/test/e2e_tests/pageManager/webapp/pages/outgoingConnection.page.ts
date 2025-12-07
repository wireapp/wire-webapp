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
import {selectByDataAttribute} from 'test/e2e_tests/utils/selector.util';
import {escapeHtml} from 'test/e2e_tests/utils/userDataProcessor';

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
    const pendingIcon = this.getPendingConnectionIconLocator(fullName);
    await pendingIcon.waitFor({state: 'visible'});
    return pendingIcon.isVisible();
  }

  async isPendingIconHidden(fullName: string) {
    const pendingIcon = this.getPendingConnectionIconLocator(fullName);
    await pendingIcon.waitFor({state: 'hidden'});
    return pendingIcon.isVisible();
  }

  private getPendingConnectionIconLocator(fullName: string) {
    return this.page.locator(
      `${selectByDataAttribute('item-conversation')}${selectByDataAttribute(escapeHtml(fullName), 'value')} ${selectByDataAttribute('status-pending')}`,
    );
  }
}
