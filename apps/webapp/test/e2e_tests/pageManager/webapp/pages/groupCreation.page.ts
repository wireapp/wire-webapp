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
  readonly groupCreationModal: Locator;
  readonly searchPeopleList: Locator;
  readonly groupNameInput: Locator;
  readonly nextButton: Locator;
  readonly createGroupButton: Locator;
  readonly addMembersButton: Locator;
  readonly sharedDriveToggle: Locator;
  readonly guestsToggle: Locator;

  readonly searchPeopleInput: Locator;
  readonly searchPeopleResults: Locator;
  readonly selectedPeopleList: Locator;
  readonly toggleSelectedListButton: Locator;
  readonly errorGroupName: Locator;

  constructor(page: Page) {
    this.groupCreationModal = page.locator('#group-creation-modal');
    this.groupNameInput = page.locator('[data-uie-name="enter-group-name"]');
    this.nextButton = page.locator('[data-uie-name="go-next"]');
    this.createGroupButton = page.locator('[data-uie-name="do-create-group"]');
    this.addMembersButton = page.locator('[data-uie-name="do-create"]');
    this.sharedDriveToggle = page.getByRole('button', {name: 'Shared Drive', exact: true});
    this.guestsToggle = page.getByRole('button', {name: 'Guests', exact: true});

    this.searchPeopleInput = page.getByRole('dialog').getByLabel('Search by name');
    this.searchPeopleList = page.getByRole('dialog').getByRole('list');
    this.searchPeopleResults = this.searchPeopleList.getByRole('listitem');
    this.selectedPeopleList = page.getByTestId('selected-search-list');
    this.toggleSelectedListButton = page.getByTestId('do-toggle-selected-search-list');
    this.errorGroupName = page.getByTestId('error-group-name');
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
    await this.sharedDriveToggle.click();
  }

  async isFilesCheckboxChecked() {
    const value = await this.sharedDriveToggle.getAttribute('data-uie-value');
    return value === 'checked';
  }

  async waitForModalClose() {
    await this.groupCreationModal.waitFor({state: 'detached'});
  }

  async selectGroupMembers(...usernames: string[]) {
    for (const username of usernames) {
      await this.searchPeopleInput.fill(username);
      await this.searchPeopleResults.filter({hasText: username}).click();
    }
  }

  async deselectGroupMember(username: string) {
    await this.groupCreationModal.getByTestId('do-toggle-selected-search-list').click();
    await this.selectedPeopleList.filter({hasText: username}).click();
  }
}
