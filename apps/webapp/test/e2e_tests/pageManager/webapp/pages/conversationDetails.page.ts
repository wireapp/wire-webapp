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
import {selectByDataAttribute, selectById, selectByClass} from 'test/e2e_tests/utils/selector.util';

export class ConversationDetailsPage {
  readonly page: Page;

  readonly addPeopleButton: Locator;
  readonly conversationDetails: Locator;
  readonly guestOptionsButton: Locator;
  readonly selfDeletingMessageButton: Locator;
  readonly archiveButton: Locator;
  readonly blockConversationButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.addPeopleButton = page.locator(`${selectByDataAttribute('go-add-people')}`);
    this.conversationDetails = page.locator('#conversation-details');
    this.guestOptionsButton = this.conversationDetails.locator('[data-uie-name="go-guest-options"]');
    this.selfDeletingMessageButton = this.conversationDetails.getByRole('button', {name: 'Self-deleting messages'});
    this.archiveButton = this.conversationDetails.locator(selectByDataAttribute('do-archive'));
    this.blockConversationButton = this.conversationDetails.locator(selectByDataAttribute('do-block'));
  }

  async waitForSidebar() {
    await this.conversationDetails.waitFor({state: 'visible'});
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
      // Wait for the user to be selected (checkbox should be checked)
      await userLocator.locator('input[type="checkbox"]').waitFor({state: 'attached'});
    }

    await this.page.locator(`${selectById('add-participants')} ${selectByDataAttribute('do-create')}`).click();
  }

  async isUserPartOfConversationAsAdmin(fullName: string) {
    const userLocator = this.page.locator(
      `${selectById('conversation-details')} ${selectByDataAttribute('list-admins')} ${selectByDataAttribute('item-user')}${selectByDataAttribute(fullName, 'value')}`,
    );
    await userLocator.waitFor({state: 'visible'});
    return userLocator.isVisible();
  }

  async isUserPartOfConversationAsMember(fullName: string) {
    const userLocator = this.page.locator(
      `${selectById('conversation-details')} ${selectByDataAttribute('list-members')} ${selectByDataAttribute('item-user')}${selectByDataAttribute(fullName, 'value')}`,
    );
    await userLocator.waitFor({state: 'visible'});
    return userLocator.isVisible();
  }

  async openParticipantDetails(fullName: string) {
    const userLocator = await this.getLocatorByUser(fullName);
    await userLocator.click();
  }

  async getLocatorByUser(fullName: string) {
    const userLocator = this.page.locator(
      `${selectById('conversation-details')} ${selectByDataAttribute('list-members')} ${selectByDataAttribute('item-user')}${selectByDataAttribute(fullName, 'value')}`,
    );
    await userLocator.waitFor({state: 'visible'});
    return userLocator;
  }

  async clickArchiveButton() {
    await this.archiveButton.click();
  }

  /** Opens the self deleting messages panel, selects the given value and closes it again */
  async setSelfDeletingMessages(value: 'Off' | '10 seconds') {
    await this.selfDeletingMessageButton.click();
    const selfDeletingMessagesPanel = this.page.locator('#timed-messages');
    // The radio options are currently not accessible so accessible locators can't be used
    await selfDeletingMessagesPanel.getByRole('radiogroup').locator('label', {hasText: value}).click();
    await selfDeletingMessagesPanel.getByRole('button', {name: 'Go back'}).click();
  }

  async addServiceToConversation(serviceName: string) {
    // Click on the Services/Apps tab
    const servicesTab = this.page.locator(
      `${selectById('add-participants')} ${selectByDataAttribute('do-add-services')}`,
    );
    await servicesTab.click();

    // Wait for search input to be ready
    const searchInput = this.page.locator(`${selectById('add-participants')} input[type="text"]`);
    await searchInput.waitFor({state: 'visible'});

    // Search for the service
    await searchInput.fill(serviceName);

    // Wait for service to appear in search results
    const serviceLocator = this.page.getByTestId('item-service').first();
    await serviceLocator.waitFor({state: 'visible'});

    // Click on the service in search results
    await serviceLocator.click();

    // Wait for "Add Service" button to be ready
    const addServiceButton = this.page.getByTestId('do-add-service');
    await addServiceButton.waitFor({state: 'visible'});
    await addServiceButton.click();
  }

  async removeServiceFromConversation(serviceName: string) {
    // Services appear in the members list with item-service test id
    const serviceLocator = this.page
      .locator(`${selectById('conversation-details')}`)
      .getByTestId('item-service')
      .filter({hasText: serviceName});
    await serviceLocator.click();

    // Wait for "Remove Service" button to be visible and enabled
    const removeServiceButton = this.page.getByTestId('do-remove');
    await removeServiceButton.waitFor({state: 'visible'});
    await removeServiceButton.click();
  }

  async isServicePartOfConversation(serviceName: string) {
    const serviceLocator = this.page
      .locator(`${selectById('conversation-details')}`)
      .getByTestId('item-service')
      .filter({hasText: serviceName});
    await serviceLocator.waitFor({state: 'visible'});
    return serviceLocator.isVisible();
  }

  async clickBlockConversationButton() {
    await this.blockConversationButton.click();
  }
}
