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
import {ConfirmModal} from '../modals/confirm.modal';

export class ParticipantDetails {
  private readonly page: Page;

  readonly userPicture: Locator;
  readonly userName: Locator;
  readonly userStatus: Locator;
  readonly userHandle: Locator;
  readonly createGroup: Locator;
  readonly block: Locator;
  readonly closeButton: Locator;
  readonly cancelRequest: Locator;
  readonly unblockButton: Locator;
  readonly removeFromGroupButton: Locator;
  readonly openConversationButton: Locator;
  readonly connectButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userPicture = this.page.getByTestId('status-profile-picture');
    this.userName = this.page.locator('.panel-participant').getByTestId('status-name');
    this.userHandle = this.page.locator('.panel-participant').getByTestId('status-username');
    this.userStatus = this.page
      .locator('#group-participant-user')
      .getByTestId(/^status-(external|guest|admin)$/)
      .and(this.page.locator('.panel-participant__label'));
    this.createGroup = this.page.locator('#conversation-details').getByRole('button', {name: 'Create group'});
    this.block = this.page.getByRole('button', {name: 'Block'});
    this.closeButton = this.page.getByRole('button', {name: 'Close conversation info'});
    this.cancelRequest = this.page.getByRole('button', {name: 'Cancel request'});
    this.unblockButton = this.page.getByRole('button', {name: 'Unblock'});
    this.removeFromGroupButton = this.page.getByRole('button', {name: 'Remove from group'});
    this.openConversationButton = this.page.getByRole('button', {name: 'Open conversation', exact: true});
    this.connectButton = this.page.getByRole('button', {name: 'Connect'});
  }

  async blockUser() {
    await this.block.click();
  }

  getUserEmailLocator(email: string) {
    return this.page.getByTestId('item-enriched-value').and(this.page.locator(`[data-uie-value="${email}"]`));
  }

  async closeParticipantDetails() {
    await this.closeButton.click();
  }

  async sendConnectRequest() {
    await this.connectButton.click();
  }

  async removeFromGroup() {
    await this.removeFromGroupButton.click();
    await new ConfirmModal(this.page).actionButton.click();
  }
}
