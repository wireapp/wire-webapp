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
import {selectByDataAttribute} from 'test/e2e_tests/utils/selector.util';

export class AccountPage {
  readonly page: Page;

  readonly sendUsageDataCheckbox: Locator;
  readonly appLockCheckboxLabel: Locator;
  readonly appLockCheckbox: Locator;
  readonly deleteAccountButton: Locator;
  readonly backUpButton: Locator;
  readonly backupFileInput: Locator;
  readonly restoreBackupButton: Locator;
  readonly logoutButton: Locator;
  readonly emailDisplay: Locator;
  readonly nameDisplay: Locator;
  readonly domainDisplay: Locator;
  readonly usernameDisplay: Locator;
  readonly editEmailButton: Locator;
  readonly editDisplayNameButton: Locator;
  readonly emailInput: Locator;
  readonly displayNameInput: Locator;
  readonly resetPasswordButton: Locator;
  readonly receiveNewsletterCheckbox: Locator;
  readonly typingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    this.sendUsageDataCheckbox = page.locator("[data-uie-name='status-preference-telemetry']+label");
    this.appLockCheckboxLabel = page.locator("[data-uie-name='status-preference-applock']+label");
    this.appLockCheckbox = page.locator("[data-uie-name='status-preference-applock']");
    this.deleteAccountButton = page.locator(selectByDataAttribute('go-delete-account'));
    this.backUpButton = page.locator(selectByDataAttribute('do-backup-export'));
    this.backupFileInput = page.locator(selectByDataAttribute('input-import-file'));
    this.restoreBackupButton = page.locator("[data-uie-name='do-backup-import']+button");
    this.logoutButton = page.locator(selectByDataAttribute('do-logout'));
    this.editEmailButton = page.locator(selectByDataAttribute('go-edit-email'));
    this.editDisplayNameButton = page.locator(selectByDataAttribute('go-edit-email'));
    this.emailInput = page.locator(selectByDataAttribute('enter-email-input'));
    this.displayNameInput = page.locator(selectByDataAttribute('enter-displayname-input'));
    this.emailDisplay = page.locator(selectByDataAttribute('email-display'));
    this.nameDisplay = page.locator(selectByDataAttribute('displayname-display'));
    this.domainDisplay = page.locator(selectByDataAttribute('item-enriched-value'));
    this.usernameDisplay = page.locator(selectByDataAttribute('username-display'));
    this.resetPasswordButton = page.locator(selectByDataAttribute('do-reset-password'));
    this.receiveNewsletterCheckbox = page.locator("[data-uie-name='status-preference-marketing']+label");
    this.typingIndicator = page.locator("[data-uie-name='status-preference-typing-indicator']+label");
  }

  async clickBackUpButton() {
    await this.backUpButton.click();
  }

  async clickDeleteAccountButton() {
    await this.deleteAccountButton.click();
  }

  async clickRestoreBackupButton() {
    await this.restoreBackupButton.click();
  }

  async toggleSendUsageData() {
    await this.sendUsageDataCheckbox.click();
  }

  async toggleReceiveNewsletter() {
    await this.receiveNewsletterCheckbox.click();
  }

  async toggleTypingIndicator() {
    await this.typingIndicator.click();
  }

  async isSendUsageDataEnabled() {
    return this.sendUsageDataCheckbox.isChecked();
  }

  async isReceiveNewsletterEnabled() {
    return this.receiveNewsletterCheckbox.isChecked();
  }

  async toggleAppLock() {
    await this.appLockCheckboxLabel.click();
  }

  async clickLogoutButton() {
    await this.logoutButton.click();
  }

  async isDisplayedEmailEquals(expectedEmail: string) {
    await this.emailDisplay.isVisible();
    const displayedEmail = await this.emailDisplay.textContent();
    return displayedEmail === expectedEmail;
  }

  async clickResetPasswordButton() {
    await this.resetPasswordButton.click();
  }

  async changeEmailAddress(newEmail: string) {
    await this.editEmailButton.click();
    await this.emailInput.fill(newEmail);
    await this.emailInput.press('Enter');
  }

  async changeName(newName: string) {
    await this.editDisplayNameButton.click();
    await this.displayNameInput.fill(newName);
    await this.displayNameInput.press('Enter');
  }
}
