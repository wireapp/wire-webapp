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

import {selectByClass, selectByDataAttribute, selectById} from 'test/e2e_tests/utils/useSelector';

export class ConversationDetailsPage {
  readonly page: Page;

  readonly addPeopleButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.addPeopleButton = page.locator(`${selectByDataAttribute('go-add-people')}`);
  }

  async isOpen(conversationName: string) {
    return (
      (await this.page
        .locator(
          `${selectById('right-column')} ${selectByClass('conversation-details__header')} ${selectByDataAttribute('status-name')}`,
        )
        .textContent()) === conversationName
    );
  }

  async clickAddPeopleButton() {
    await this.addPeopleButton.click();
  }

  async addUsersToConversation(fullNames: string[]) {
    for (const fullName of fullNames) {
      const userLocator = this.page.locator(
        `${selectById('add-participants')} ${selectByDataAttribute('search-list')} [aria-label="Open profile of ${fullName}"]`,
      );
      await userLocator.click();
      await this.page.waitForTimeout(1000); // Wait for the UI to update after selecting user
    }

    await this.page.locator(`${selectById('add-participants')} ${selectByDataAttribute('do-create')}`).click();
  }

  async isUserPartOfConversationAsMember(fullName: string) {
    const userLocator = this.page.locator(
      `${selectById('conversation-details')} ${selectByDataAttribute('list-admins')} ${selectByDataAttribute('item-user')}[data-uie-value="${fullName}"]`,
    );
    return await userLocator.isVisible({timeout: 5000});
  }

  async isUserPartOfConversationAsAdmin(fullName: string) {
    const userLocator = this.page.locator(
      `${selectById('conversation-details')} ${selectByDataAttribute('list-members')} ${selectByDataAttribute('item-user')}[data-uie-value="${fullName}"]`,
    );
    return await userLocator.isVisible({timeout: 5000});
  }
}
