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
import {GuestOptionsPage} from './guestOptions.page';

export class ConversationDetailsPage {
  private readonly page: Page;

  readonly groupAdmins: Locator;
  readonly groupMembers: Locator;

  readonly addPeopleButton: Locator;
  readonly conversationDetails: Locator;
  readonly guestOptionsButton: Locator;
  readonly selfDeletingMessageButton: Locator;
  readonly archiveButton: Locator;
  readonly blockConversationButton: Locator;
  readonly clearConversationContentButton: Locator;
  readonly selectedSearchList: Locator;
  readonly searchPeopleInput: Locator;
  readonly searchList: Locator;
  readonly deleteGroupButton: Locator;
  readonly notificationsButton: Locator;
  readonly editConversationNameButton: Locator;
  readonly textFieldForConversationName: Locator;

  constructor(page: Page) {
    this.page = page;
    this.conversationDetails = page.locator('#conversation-details');

    this.groupAdmins = this.conversationDetails.getByRole('list', {name: 'Group Admins'}).getByRole('listitem');
    this.groupMembers = this.conversationDetails.getByRole('list', {name: 'Group Members'}).getByRole('listitem');

    this.addPeopleButton = page.getByTestId('go-add-people');
    this.guestOptionsButton = this.conversationDetails.locator('[data-uie-name="go-guest-options"]');
    this.selfDeletingMessageButton = this.conversationDetails.getByRole('button', {name: 'Self-deleting messages'});
    this.archiveButton = this.conversationDetails.getByTestId('do-archive');
    this.blockConversationButton = this.conversationDetails.getByTestId('do-block');
    this.clearConversationContentButton = this.conversationDetails.getByRole('button', {name: 'Clear Content'});
    this.selectedSearchList = this.page.getByTestId('selected-search-list');
    this.searchPeopleInput = page.getByRole('textbox', {name: 'Search by name'});
    this.searchList = this.page.locator('#add-participants').getByRole('list');
    this.deleteGroupButton = this.page.getByRole('button', {name: 'Delete group'});
    this.notificationsButton = this.page.getByRole('button', {name: 'Notifications'});
    this.editConversationNameButton = this.page.getByRole('button', {name: 'Change conversation name'});
    this.textFieldForConversationName = this.page.locator('textarea[data-uie-name="enter-name"]');
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
    await this.getLocatorByUser(fullName).click();
  }

  getUserRoleIcon(fullName: string) {
    return this.getLocatorByUser(fullName).getByTestId(/^status-(external|guest|admin)$/);
  }

  getUserAvailabilityIcon(fullName: string) {
    return this.getLocatorByUser(fullName).getByTestId('status-availability-icon');
  }

  getLocatorByUser(fullName: string) {
    return this.page
      .locator('#conversation-details')
      .getByTestId('list-users')
      .getByTestId('item-user')
      .and(this.page.locator(`[data-uie-value="${fullName}"]`));
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

  /** Opens the guests panel, creates a link for guests to join the group, closes the panel and returns the created link */
  async createGuestLink(options?: Parameters<ReturnType<typeof GuestOptionsPage>['createLink']>[0]) {
    await this.guestOptionsButton.click();

    const guestOptionsPage = GuestOptionsPage(this.page);
    const link = await guestOptionsPage.createLink(options);

    await guestOptionsPage.backButton.click();
    return link;
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

  async openGuestOptions() {
    await this.guestOptionsButton.click();
  }

  async clickClearConversationContentButton() {
    await this.clearConversationContentButton.click();
  }

  async setNotifications(value: Parameters<typeof this.selectNotificationsLevel>[0]) {
    await this.notificationsButton.click();
    await this.selectNotificationsLevel(value);

    // Close the settings by clicking "Go back" button.
    await this.page.getByRole('button', {name: 'Go back'}).click();
  }

  async selectNotificationsLevel(value: 'Everything' | 'Mentions and replies' | 'Nothing') {
    await this.page.getByRole('radiogroup').getByText(value).click();
  }

  async changeConversationName(newConversationName: string) {
    await this.editConversationNameButton.click();
    await this.textFieldForConversationName.fill(newConversationName);
    await this.textFieldForConversationName.press('Enter');
  }
}
