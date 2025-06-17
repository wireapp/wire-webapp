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

export class EmailVerificationPage {
  readonly page: Page;

  readonly verificationCodeInput: Locator;

  constructor(page: Page) {
    this.page = page;

    this.verificationCodeInput = page.locator('input');
  }

  // Doesn't work with headless chromium
  async enterVerificationCode(code: string) {
    if (code.length !== 6) {
      throw new Error('Verification code must be exactly 6 characters long');
    }

    const inputs = await this.page.locator('input').all();
    for (let i = 0; i < code.length; i++) {
      await inputs[i].focus();
      await this.page.keyboard.press(code[i]);
    }
    await this.page.keyboard.press('Enter');
  }
}
