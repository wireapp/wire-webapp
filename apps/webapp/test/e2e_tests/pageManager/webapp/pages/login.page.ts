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

import type {Page, Locator} from '@playwright/test';
import is from '@sindresorhus/is';

import type {User} from 'test/e2e_tests/data/user';

export class LoginPage {
  private readonly page: Page;

  readonly signInButton: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginErrorText: Locator;
  readonly publicComputerCheckbox: Locator;
  readonly header: Locator;
  readonly entropyCanvas: Locator;
  readonly entropyConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.signInButton = page.locator('[data-uie-name="do-sign-in"]');
    this.emailInput = page.locator('[data-uie-name="enter-email"]');
    this.passwordInput = page.locator('[data-uie-name="enter-password"]');
    this.loginErrorText = page.locator('[data-uie-name="error-message"]');
    this.publicComputerCheckbox = page.getByText('This is a public computer');
    this.header = page.getByRole('heading');
    this.entropyCanvas = page.locator('[data-uie-name="element-entropy-canvas"]');
    this.entropyConfirmButton = page.locator('[data-uie-name="do-entropy-confirm"]');
  }

  async login(user: Pick<User, 'email' | 'password'>, options?: {publicComputer?: boolean}): Promise<void> {
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);

    if (options?.publicComputer === true) {
      await this.publicComputerCheckbox.click();
    }

    await this.signInButton.click();
  }

  async completeEntropyCollection(): Promise<void> {
    const boundingBox = await this.entropyCanvas.boundingBox();

    if (is.nullOrUndefined(boundingBox)) {
      throw new Error('Entropy canvas is visible but has no bounding box');
    }

    for (let index = 0; index < 1_500; index += 1) {
      const x = boundingBox.x + 8 + ((index * 37) % Math.max(1, boundingBox.width - 16));
      const y = boundingBox.y + 8 + ((index * 53) % Math.max(1, boundingBox.height - 16));

      await this.page.mouse.move(x, y);
    }

    await this.entropyConfirmButton.waitFor({state: 'visible', timeout: 5_000});
    await this.entropyConfirmButton.click();
  }
}
