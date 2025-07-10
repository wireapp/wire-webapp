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

export class TeamLoginPage {
  readonly page: Page;

  readonly emailInputLogin: Locator;
  readonly passwordInput: Locator;
  readonly showPassword: Locator;
  readonly hidePassword: Locator;
  readonly errorMessage: Locator;
  readonly loginButton: Locator;
  readonly teamCreateButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.emailInputLogin = page.locator('[data-uie-name="enter-login-identifier"]');
    this.passwordInput = page.locator('[data-uie-name="enter-login-password"]');
    this.showPassword = page.locator('[data-uie-name="do-show-password"]');
    this.hidePassword = page.locator('[data-uie-name="do-hide-password"]');
    this.errorMessage = page.locator('[data-uie-name="error-message"]');
    this.loginButton = page.locator('[data-uie-name="do-login"]');
    this.teamCreateButton = page.locator('[data-uie-name="go-create-team"]');
  }

  async inputEmail(email: string) {
    await this.emailInputLogin.fill(email);
  }

  async inputPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async toggleShowPassword() {
    await this.showPassword.click();
  }

  async toggleHidePassword() {
    await this.hidePassword.click();
  }

  async isPasswordHidden() {
    const inputType = await this.passwordInput.getAttribute('type');

    if (inputType === 'password') {
      return true;
    }
    return false;
  }

  async clickLoginButton() {
    await this.loginButton.click();
  }

  async getErrorMessage() {
    return (await this.errorMessage.textContent()) ?? '';
  }

  async clickTeamCreateButton() {
    await this.teamCreateButton.click();
  }
}
