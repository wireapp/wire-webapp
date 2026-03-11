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

export class LandingwelcomePage {
  readonly page: Page;

  readonly header: Locator;
  readonly emailInput: Locator;
  readonly signInButton: Locator;


  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('#sso-login-heading-text');
    this.emailInput = page.locator('input[name="sso-code-email"]');
    this.signInButton = page.getByTestId('do-sso-sign-in');
  }

}
