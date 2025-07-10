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

export class RegisterSuccessPage {
  readonly page: Page;

  readonly downloadWireButton: Locator;
  readonly openWireWebButton: Locator;
  readonly manageTeamButton: Locator;
  readonly teamSignUpSuccessMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.downloadWireButton = page.locator('[data-uie-name="do-download-wire"]');
    this.openWireWebButton = page.locator('[data-uie-name="do-open-wire-web"]');
    this.manageTeamButton = page.locator('[data-uie-name="do-manage-team"]');
    this.teamSignUpSuccessMessage = page.locator(
      '//span[text()="Your team is now ready to collaborate easily and securely!"]',
    );
  }

  async clickOpenWireWebButton() {
    await this.openWireWebButton.click();
  }

  async clickManageTeamButton() {
    await this.manageTeamButton.click();
  }

  async isTeamSignUpSuccessMessageVisible() {
    return await this.teamSignUpSuccessMessage.isVisible();
  }
}
