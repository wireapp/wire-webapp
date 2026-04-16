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
  readonly soundAlertsRadioGroup: Locator;
  readonly notificationsRadioGroup: Locator;

  constructor(page: Page) {
    this.soundAlertsRadioGroup = page.getByRole('group', {name: 'Sound alerts'}).getByRole('radiogroup');
    this.notificationsRadioGroup = page.getByRole('group', {name: 'Notifications'}).getByRole('radiogroup');
  }

  async setSoundAlerts(option: 'All' | 'Some' | 'None') {
    await this.soundAlertsRadioGroup.locator('label', {hasText: option}).click();
  }

  async setNotifications(option: 'Show sender and message' | 'Show sender' | 'Hide details' | 'Off') {
    // Radio groups in Wire are not a11y compliant so we need to click them since checking doesn't work
    await this.notificationsRadioGroup.locator('label', {hasText: new RegExp(`^${option}$`)}).click();
  }
}
