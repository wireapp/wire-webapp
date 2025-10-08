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

export class AppLockModal {
  readonly page: Page;

  readonly lockPasscodeInput: Locator;
  readonly unlockPasscodeInput: Locator;
  readonly appLockWipeInput: Locator;
  readonly appLockModal: Locator;
  readonly appLockActionButton: Locator;
  readonly appLockModalHeader: Locator;
  readonly appLockModalText: Locator;
  readonly loadingBar: Locator;
  readonly errorMessage: Locator;
  readonly forgotPassphraseButton: Locator;
  readonly wipeDatabaseButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.appLockModal = page.locator("[data-uie-name='applock-modal']");
    this.lockPasscodeInput = page.locator("[data-uie-name='applock-modal'] [data-uie-name='input-applock-set-a']");
    this.unlockPasscodeInput = page.locator("[data-uie-name='applock-modal'] [data-uie-name='input-applock-unlock']");
    this.appLockWipeInput = this.appLockModal.locator(selectByDataAttribute('input-applock-wipe'));
    this.appLockActionButton = this.appLockModal.locator("[data-uie-name='do-action']");
    this.appLockModalHeader = page.locator("[data-uie-name='applock-modal'] [data-uie-name='applock-modal-header']");
    this.appLockModalText = page.locator("[data-uie-name='applock-modal'] [data-uie-name='label-applock-unlock-text']");
    this.loadingBar = page.locator('.progress-bar');
    this.errorMessage = this.appLockModal.locator(selectByDataAttribute('label-applock-unlock-error'));
    this.forgotPassphraseButton = this.appLockModal.locator(selectByDataAttribute('go-forgot-passphrase'));
    this.wipeDatabaseButton = this.appLockModal.locator(selectByDataAttribute('go-wipe-database'));
  }

  async setPasscode(passcode: string) {
    await this.lockPasscodeInput.fill(passcode);
    await this.appLockActionButton.click();
  }

  async unlockAppWithPasscode(passcode: string) {
    await this.unlockPasscodeInput.fill(passcode);
    await this.appLockActionButton.click();
  }

  async inputUserPassword(password: string) {
    await this.appLockWipeInput.fill(password);
    await this.appLockActionButton.click();
  }

  async isVisible() {
    await this.appLockModal.waitFor({state: 'visible'});
    return await this.appLockModal.isVisible();
  }

  async isHidden() {
    await this.appLockModal.waitFor({state: 'hidden'});
    return await this.appLockModal.isHidden();
  }

  async getAppLockModalText() {
    return (await this.appLockModalText.textContent()) ?? '';
  }

  async getAppLockModalHeader() {
    return await this.appLockModalHeader.textContent();
  }

  async clickForgotPassphrase() {
    await this.forgotPassphraseButton.click();
  }
  async clickReset() {
    await this.appLockActionButton.click();
  }
  async clickWipeDB() {
    await this.wipeDatabaseButton.click();
  }
}
