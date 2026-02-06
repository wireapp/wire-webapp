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

export class ConversationDetailsPage {
  readonly page: Page;

  readonly addPeopleButton: Locator;
  readonly conversationDetails: Locator;
  readonly guestOptionsButton: Locator;
  readonly selfDeletingMessageButton: Locator;
  readonly archiveButton: Locator;
  readonly blockConversationButton: Locator;
  readonly clearConversationContentButton: Locator;
  readonly selectedSearchList: Locator;
  readonly searchList: Locator;
  readonly deleteGroupButton: Locator;
  readonly notificationsButton: Locator;
  readonly editConversationNameButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.addPeopleButton = page.getByTestId('go-add-people');
    this.conversationDetails = page.locator('#conversation-details');
    this.guestOptionsButton = this.conversationDetails.locator('[data-uie-name="go-guest-options"]');
    this.selfDeletingMessageButton = this.conversationDetails.getByRole('button', {name: 'Self-deleting messages'});
    this.archiveButton = this.conversationDetails.getByTestId('do-archive');
    this.blockConversationButton = this.conversationDetails.getByTestId('do-block');
    this.clearConversationContentButton = this.conversationDetails.getByRole('button', {name: 'Clear Content'});
    this.selectedSearchList = this.page.getByTestId('selected-search-list');
    this.searchList = this.page.getByTestId('search-list');
    this.deleteGroupButton = this.page.getByRole('button', {name: 'Delete group'});
    this.notificationsButton = this.page.getByRole('button', {name: 'Notifications'});
    this.editConversationNameButton = this.page.getByRole('button', {name: 'Change conversation name'});
  }

  async waitForSidebar() {
    await this.conversationDetails.waitFor({state: 'visible'});
  }

  async isOpen(conversationName: string) {
    return (
      (await this.page
        .locator('#right-column .conversation-details__header')
        .getByTestId('status-name')
        .textContent()) === conversationName
    );
  }

  async clickAddPeopleButton() {
    await this.addPeopleButton.click();
  }

  async clickSelectedUsersButton() {
    await this.page.locator('#add-participants').getByTestId('do-toggle-selected-search-list').click();
  }

  async addUsersToConversation(fullNames: string[]) {
    for (const fullName of fullNames) {
      await this.searchList.locator(`li div[aria-label*="${fullName}"]`).click();
      // Wait for the user to be selected (checkbox should be checked)
      await this.clickSelectedUsersButton();
      await this.selectedSearchList.locator(`li div[aria-label*="${fullName}"]`).waitFor({state: 'attached'});
    }

    await this.page.locator('#add-participants').getByTestId('do-create').click();
  }

  async isUserPartOfConversationAsAdmin(fullName: string) {
    const userLocator = this.page
      .locator('#conversation-details')
      .getByTestId('list-admins')
      .getByTestId('item-user')
      .and(this.page.locator(`[data-uie-value="${fullName}"]`));
    await userLocator.waitFor({state: 'visible'});
    return userLocator.isVisible();
  }

  async isUserPartOfConversationAsMember(fullName: string) {
    const userLocator = this.page
      .locator('#conversation-details')
      .getByTestId('list-members')
      .getByTestId('item-user')
      .and(this.page.locator(`[data-uie-value="${fullName}"]`));
    await userLocator.waitFor({state: 'visible'});
    return userLocator.isVisible();
  }

  async openParticipantDetails(fullName: string) {
    const userLocator = await this.getLocatorByUser(fullName);
    await userLocator.click();
  }

  async getLocatorByUser(fullName: string) {
    const userLocator = this.page
      .locator('#conversation-details')
      .getByTestId('list-members')
      .getByTestId('item-user')
      .and(this.page.locator(`[data-uie-value="${fullName}"]`));
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
    const servicesTab = this.page.locator('#add-participants').getByTestId('do-add-services');
    await servicesTab.click();

    // Wait for search input to be ready
    const searchInput = this.page.locator('#add-participants input[type="text"]');
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
      .locator('#conversation-details')
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
      .locator('#conversation-details')
      .getByTestId('item-service')
      .filter({hasText: serviceName});
    await serviceLocator.waitFor({state: 'visible'});
    return serviceLocator.isVisible();
  }

  async clickBlockConversationButton() {
    await this.blockConversationButton.click();
  }

  async clickClearConversationContentButton() {
    await this.clearConversationContentButton.click();
  }
}
