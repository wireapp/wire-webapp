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

export class DevicesPage {
  readonly page: Page;

  readonly proteusId: Locator;
  readonly activeDevices: Locator;

  constructor(page: Page) {
    this.page = page;

    // The id is not using any label or similar but just multiple paragraphs beneath each other
    this.proteusId = page.locator("p:text('Proteus ID') + p");
    this.activeDevices = page.getByRole('group', {name: 'Active'}).getByRole('button', {name: /device details/});
  }
}
