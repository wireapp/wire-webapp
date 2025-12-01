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

import type {Page, Locator} from '@playwright/test';

import type {User} from 'test/e2e_tests/data/user';

export class LoginPage {
  readonly page: Page;

  readonly signInButton: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginErrorText: Locator;
  readonly publicComputerCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;

    this.signInButton = page.locator('[data-uie-name="do-sign-in"]');
    this.emailInput = page.locator('[data-uie-name="enter-email"]');
    this.passwordInput = page.locator('[data-uie-name="enter-password"]');
    this.loginErrorText = page.locator('[data-uie-name="error-message"]');
    this.publicComputerCheckbox = page.getByText('This is a public computer');
  }

  async login(user: Pick<User, 'email' | 'password'>) {
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.signInButton.click();
  }
}
