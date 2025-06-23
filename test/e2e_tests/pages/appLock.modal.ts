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

export class AppLockModal {
  readonly page: Page;

  readonly lockPasscodeInput: Locator;
  readonly unlockPasscodeInput: Locator;
  readonly appLockModal: Locator;
  readonly appLockActionButton: Locator;
  readonly appLockModalHeader: Locator;
  readonly appLockModalText: Locator;
  readonly loadingBar: Locator;

  constructor(page: Page) {
    this.page = page;

    this.appLockModal = page.locator("[data-uie-name='applock-modal']");
    this.lockPasscodeInput = page.locator("[data-uie-name='applock-modal'] [data-uie-name='input-applock-set-a']");
    this.unlockPasscodeInput = page.locator("[data-uie-name='applock-modal'] [data-uie-name='input-applock-unlock']");
    this.appLockActionButton = page.locator("[data-uie-name='applock-modal'] [data-uie-name='do-action']");
    this.appLockModalHeader = page.locator("[data-uie-name='applock-modal'] [data-uie-name='applock-modal-header']");
    this.appLockModalText = page.locator("[data-uie-name='applock-modal'] [data-uie-name='label-applock-unlock-text']");
    this.loadingBar = page.locator('.progress-bar');
  }

  async setPasscode(passcode: string) {
    await this.lockPasscodeInput.fill(passcode);
    await this.appLockActionButton.click();
  }

  async unlockAppWithPasscode(passcode: string) {
    await this.unlockPasscodeInput.fill(passcode);
    await this.appLockActionButton.click();
  }

  async isVisible() {
    return await this.appLockModal.isVisible();
  }

  async isHidden() {
    return await this.appLockModal.isHidden();
  }

  async getAppLockModalText() {
    return (await this.appLockModalText.textContent()) ?? '';
  }

  async getAppLockModalHeader() {
    return (await this.appLockModalHeader.textContent()) ?? '';
  }
}
