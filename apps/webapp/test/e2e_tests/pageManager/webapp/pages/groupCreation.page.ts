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

export class GroupCreationPage {
  readonly page: Page;

  readonly groupCreationModal: Locator;
  readonly groupNameInput: Locator;
  readonly nextButton: Locator;
  readonly createGroupButton: Locator;
  readonly addMembersButton: Locator;
  readonly filesCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;

    this.groupCreationModal = page.locator('#group-creation-modal');
    this.groupNameInput = page.locator('[data-uie-name="enter-group-name"]');
    this.nextButton = page.locator('[data-uie-name="go-next"]');
    this.createGroupButton = page.locator('[data-uie-name="do-create-group"]');
    this.addMembersButton = page.locator('[data-uie-name="do-create"]');
    this.filesCheckbox = page.locator('[data-uie-name="do-toggle-cells"]');
  }

  async setGroupName(name: string) {
    await this.groupNameInput.fill(name);
    await this.nextButton.click();
  }

  async clickNextButton() {
    await this.nextButton.click();
  }

  async clickCreateGroupButton() {
    await this.createGroupButton.click();
  }

  async clickAddMembers() {
    await this.addMembersButton.click();
  }

  async enableFilesCheckbox() {
    await this.filesCheckbox.click();
  }

  async isFilesCheckboxChecked() {
    const value = await this.filesCheckbox.getAttribute('data-uie-value');
    return value === 'checked';
  }

  async waitForModalClose() {
    await this.groupCreationModal.waitFor({state: 'detached'});
  }
}
