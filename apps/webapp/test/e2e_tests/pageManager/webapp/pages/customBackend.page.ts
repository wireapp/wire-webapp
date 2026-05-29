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

export class CustomBackendPage {
  readonly title: Locator;
  readonly redirectWarningText: Locator;
  readonly adminInfoText: Locator;
  readonly connectButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.title = page.getByText("Connect to your organization's backend?", {exact: true});
    this.redirectWarningText = page.getByText('Your email belongs to another backend.');
    this.adminInfoText = page.getByText('Your IT team administers this Wire backend.');
    this.connectButton = page.getByRole('button', {name: 'Connect'});
    this.cancelButton = page.getByRole('button', {name: 'Cancel'});
  }
}
