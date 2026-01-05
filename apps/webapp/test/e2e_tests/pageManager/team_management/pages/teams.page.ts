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
import {selectByDataAttribute} from 'test/e2e_tests/utils/selector.util';

export class TeamsPage {
  readonly page: Page;

  readonly profileIcon: Locator;
  readonly peopleButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.profileIcon = page.locator("[data-uie-name='element-avatar-image']");
    this.peopleButton = page.locator("[data-uie-name='go-manage-team-page']");
  }

  async isProfileIconVisible() {
    return await this.profileIcon.isVisible();
  }

  async clickPeopleButton() {
    await this.peopleButton.click();
  }

  async isUserVisibleAsSelf(value: string) {
    const selfUserLocator = this.page.locator(
      `${selectByDataAttribute('member-list-item')}${selectByDataAttribute(value, 'value')} ${selectByDataAttribute('member-list-item-you')}`,
    );
    await selfUserLocator.waitFor({state: 'visible'});
    return await selfUserLocator.isVisible();
  }

  async getUserRole(value: string) {
    const userRoleLocator = this.page.locator(
      `${selectByDataAttribute('member-list-item')}${selectByDataAttribute(value, 'value')} ${selectByDataAttribute('select-member-role')}`,
    );
    return (await userRoleLocator.textContent()) ?? '';
  }
}
