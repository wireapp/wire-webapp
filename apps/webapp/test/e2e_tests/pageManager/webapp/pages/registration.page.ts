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

import {User} from 'test/e2e_tests/data/user';

export class RegistrationPage {
  readonly page: Page;

  readonly passwordPolicyInfo: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly termsCheckbox: Locator;
  readonly errorLabel: Locator;
  readonly passwordPolicy: Locator;

  constructor(page: Page) {
    this.page = page;
    this.passwordPolicyInfo = page.locator('[data-uie-name="element-password-help"]');
    this.nameInput = page.locator('[data-uie-name="enter-name"]');
    this.emailInput = page.locator('[data-uie-name="enter-email"]');
    this.passwordInput = page.locator('[data-uie-name="enter-password"]');
    this.confirmPasswordInput = page.locator('[data-uie-name="enter-confirm-password"]');
    this.submitButton = page.locator('[data-uie-name="do-next"]');
    this.termsCheckbox = page.locator('[data-uie-name="do-accept-terms"]');
    this.errorLabel = page.locator('[data-uie-name="error-message"]');
    this.passwordPolicy = page.locator('[data-uie-name="element-password-help"]');
  }

  async isPasswordPolicyInfoVisible() {
    return (
      (await this.passwordPolicyInfo.textContent()) ==
      'Use at least 8 characters, with one lowercase letter, one capital letter, a number, and a special character.'
    );
  }

  async fillInUserInfo(user: User) {
    await this.nameInput.fill(`${user.firstName} ${user.lastName}`);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.confirmPasswordInput.fill(user.password);
  }

  async toggleTermsCheckbox() {
    await this.termsCheckbox.dispatchEvent('click');
  }

  async isSubmitButtonEnabled() {
    return await this.submitButton.isEnabled();
  }

  async clickSubmitButton() {
    await this.submitButton.click();
  }
}
