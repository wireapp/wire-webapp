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

export class ResetPasswordPage {
  readonly page: Page;

  readonly newPasswordInput: Locator;
  readonly passwordChangeMessage: Locator;
  readonly setNewPasswordButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.newPasswordInput = page.locator(selectByDataAttribute('enter-new-password'));
    this.passwordChangeMessage = page.getByText('You can now log in with your new password.');
    this.setNewPasswordButton = page.locator(selectByDataAttribute('do-set-new-password'));
  }

  async setNewPassword(password: string) {
    await this.newPasswordInput.fill(password);
    await this.setNewPasswordButton.click();
  }

  async isPasswordChangeMessageVisible() {
    await this.passwordChangeMessage.waitFor({state: 'visible'});
    return this.passwordChangeMessage.isVisible();
  }
}
