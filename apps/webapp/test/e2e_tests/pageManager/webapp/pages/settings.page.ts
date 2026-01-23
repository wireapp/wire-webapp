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

export class SettingsPage {
  readonly page: Page;

  readonly accountButton: Locator;
  readonly devicesButton: Locator;
  readonly optionsButton: Locator;
  readonly audioVideoButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.accountButton = page.getByRole('button', {name: 'Account'});
    this.devicesButton = page.getByRole('button', {name: 'Devices'});
    this.optionsButton = page.getByRole('button', {name: 'Options'});
    this.audioVideoButton = page.getByRole('button', {name: 'Audio / Video'});
  }

  async clickAudioVideoSettingsButton() {
    await this.audioVideoButton.click();
  }

  async clickAccountButton() {
    await this.accountButton.click();
  }

  async clickOptionsButton() {
    await this.optionsButton.click();
  }
}
