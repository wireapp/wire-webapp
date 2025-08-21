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

export class LoginPage {
  readonly page: Page;

  readonly backButton: Locator;
  readonly signInButton: Locator;
  readonly loginForm: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginErrorText: Locator;

  constructor(page: Page) {
    this.page = page;

    this.backButton = page.locator('[data-uie-name="go-index"]');
    this.signInButton = page.locator('[data-uie-name="do-sign-in"]');
    this.loginForm = page.locator('[data-uie-name="login"]');
    this.emailInput = page.locator('[data-uie-name="enter-email"]');
    this.passwordInput = page.locator('[data-uie-name="enter-password"]');
    this.loginErrorText = page.locator('[data-uie-name="error-message"]');
  }

  async isEmailFieldVisible() {
    return await this.emailInput.isVisible();
  }

  async inputEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async inputPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickSignInButton() {
    await this.signInButton.click();
  }

  async getErrorMessage() {
    return (await this.loginErrorText.textContent()) ?? '';
  }
}
