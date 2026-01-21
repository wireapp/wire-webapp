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

export class EmailVerificationPage {
  readonly codeLength = 6;
  readonly page: Page;

  readonly verificationCodeInput: Locator;
  readonly verificationCodeInputLabel: Locator;
  readonly resendButton: Locator;
  readonly errorLabel: Locator;

  constructor(page: Page) {
    this.page = page;

    this.verificationCodeInput = page.locator('input');
    this.verificationCodeInputLabel = page.locator(selectByDataAttribute('label-with-email'));
    this.errorLabel = page.locator(selectByDataAttribute('error-message'));
    this.resendButton = page.locator(selectByDataAttribute('do-resend-code'));
  }

  // Doesn't work with headless chromium
  async enterVerificationCode(code: string) {
    if (code.length !== this.codeLength) {
      throw new Error('Verification code must be exactly 6 characters long');
    }

    const inputs = await this.page.locator('input').all();
    for (let i = 0; i < code.length; i++) {
      await inputs[i].focus();
      await this.page.keyboard.press(code[i]);
    }
    await this.page.keyboard.press('Enter');
  }

  async clearCode() {
    const inputs = await this.page.locator('input').all();
    for (let i = 0; i < this.codeLength; i++) {
      await inputs[i].focus();
      await this.page.keyboard.press('Backspace');
    }
  }
  async pressSubmit() {
    await this.page.getByRole('button', {name: 'Submit'}).click();
  }

  async isEmailVerificationPageVisible() {
    await this.verificationCodeInputLabel.waitFor({state: 'visible'});
    return true;
  }
}
