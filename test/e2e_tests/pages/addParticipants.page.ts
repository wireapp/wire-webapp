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

export class AddParticipantsPage {
  readonly page: Page;

  readonly addParticipantsPage: Locator;
  readonly searchInput: Locator;
  readonly contactsList: Locator;
  readonly addButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addParticipantsPage = page.locator('#add-participants');
    this.searchInput = this.addParticipantsPage.locator('[data-uie-name="enter-users"]');
    this.contactsList = this.addParticipantsPage.locator(
      '[data-uie-name="item-user"] [data-uie-name="status-username"]',
    );
    this.addButton = this.addParticipantsPage.locator('[data-uie-name="do-create"]');
  }

  async searchForUser(username: string) {
    await this.searchInput.fill(username);
  }

  async selectUser(username: string) {
    await this.clickUserFromContactsList(username);
  }

  async clickAddButton() {
    await this.addButton.click();
  }

  private async clickUserFromContactsList(username: string) {
    const timeout = 30000;
    const delayBetweenAttempts = 500;
    const maxAttempts = timeout / delayBetweenAttempts;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      console.info(`Attempt ${attempt + 1} to find user ${username} in contacts list`);
      for (const result of await this.contactsList.all()) {
        const text = await result.textContent();
        if (text?.includes(username)) {
          await result.click();
          return;
        }
      }
      await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
    }
    throw new Error(`User ${username} not found in contacts list`);
  }
}
