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

export class WelcomePage {
  readonly page: Page;

  readonly loginButton: Locator;
  readonly createAccountButton: Locator;
  readonly createEnterpriseAccountButton: Locator;
  readonly createPersonalAccountButton: Locator;
  readonly logoutReasonText: Locator;

  constructor(page: Page) {
    this.page = page;

    this.loginButton = page.locator('[data-uie-name="go-login"]');
    this.createAccountButton = page.locator('[data-uie-name="go-create-account"]');
    this.createEnterpriseAccountButton = page.locator(
      '[data-uie-name="select-account-type-button"][variant="primary"]',
    );
    this.createPersonalAccountButton = page.locator(
      '[data-uie-name="select-account-type-button"][variant="secondary"]',
    );
    this.logoutReasonText = page.locator('[data-uie-name="status-logout-reason"]');
  }

  async getLogoutReasonText() {
    return (await this.logoutReasonText.textContent()) ?? '';
  }

  async clickCreateAccountButton() {
    await this.createAccountButton.click();
  }

  async clickCreatePersonalAccountButton() {
    await this.createPersonalAccountButton.click();
  }

  async clickLogin() {
    await this.loginButton.click();
  }
}
