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

export class RequestResetPasswordPage {
  readonly page: Page;

  readonly emailInput: Locator;
  readonly resetPasswordButton: Locator;
  readonly goBackToLoginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator(selectByDataAttribute('enter-email'));
    this.resetPasswordButton = page.locator(selectByDataAttribute('do-send-password-reset-email'));
    this.goBackToLoginButton = page.locator(selectByDataAttribute('do-go-back-to-login'));
  }

  async requestPasswordResetForEmail(email: string) {
    await this.emailInput.fill(email);
    await this.resetPasswordButton.click();
  }

  async clickGoBackToLoginButton() {
    await this.goBackToLoginButton.click();
  }
}
