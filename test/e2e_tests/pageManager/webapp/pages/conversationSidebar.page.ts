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

export class ConversationSidebar {
  readonly page: Page;

  readonly personalStatusName: Locator;
  readonly personalUserName: Locator;
  readonly preferencesButton: Locator;
  readonly allConverationsButton: Locator;
  readonly connectButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.personalStatusName = page.locator('[data-uie-name="status-name"]');
    this.personalUserName = page.locator('[data-uie-name="user-handle"]');
    this.preferencesButton = page.locator('[data-uie-name="go-preferences"]');
    this.allConverationsButton = page.locator('[data-uie-name="go-recent-view"]');
    this.connectButton = page.locator('button[data-uie-name="go-people"]');
  }

  async getPersonalStatusName() {
    return (await this.personalStatusName.textContent()) ?? '';
  }

  async getPersonalUserName() {
    return (await this.personalUserName.textContent()) ?? '';
  }

  async clickPreferencesButton() {
    await this.preferencesButton.click();
  }

  async clickAllConversationsButton() {
    await this.allConverationsButton.click();
  }

  async clickConnectButton() {
    await this.connectButton.click();
  }
}
