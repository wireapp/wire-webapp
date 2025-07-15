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

import {selectByDataAttribute} from 'test/e2e_tests/utils/useSelector';

export class AccountPage {
  readonly page: Page;

  readonly sendUsageDataCheckbox: Locator;
  readonly appLockCheckbox: Locator;
  readonly deleteAccountButton: Locator;
  private readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.sendUsageDataCheckbox = page.locator("[data-uie-name='status-preference-telemetry']+label");
    this.appLockCheckbox = page.locator("[data-uie-name='status-preference-applock']+label");
    this.deleteAccountButton = page.locator("[data-uie-name='go-delete-account']");
    this.logoutButton = this.page.locator(selectByDataAttribute('do-logout'));
  }

  async clickDeleteAccountButton() {
    await this.deleteAccountButton.click();
  }

  async toggleSendUsageData() {
    await this.sendUsageDataCheckbox.click();
  }

  async toggleAppLock() {
    await this.appLockCheckbox.click();
  }

  async clickLogoutButton() {
    await this.logoutButton.click();
  }
}
