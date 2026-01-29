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

export class OptionsPage {
  readonly checkboxSoundAlertsAll: Locator;
  readonly checkboxSoundAlertsSome: Locator;
  readonly checkboxSoundAlertsNone: Locator;

  constructor(page: Page) {
    this.checkboxSoundAlertsAll = page.getByTestId('preferences-options-audio-all');
    this.checkboxSoundAlertsSome = page.getByTestId('preferences-options-audio-some');
    this.checkboxSoundAlertsNone = page.getByTestId('preferences-options-audio-none');
  }

  async checkSoundAll() {
    await this.checkboxSoundAlertsAll.check();
  }
  async checkSoundSome() {
    await this.checkboxSoundAlertsSome.check();
  }
  async checkSoundNone() {
    await this.checkboxSoundAlertsNone.check();
  }
}
