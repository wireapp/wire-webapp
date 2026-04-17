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

export class UserProfileModal {
  readonly modal: Locator;
  readonly connectButton: Locator;
  readonly startConversationButton: Locator;
  readonly unblockButton: Locator;
  readonly blockButton: Locator;
  readonly openConversationButton: Locator;
  readonly guestChip: Locator;
  readonly connectWarning: Locator;
  readonly participantFullname: Locator;
  readonly participantUsername: Locator;
  readonly userEmailLabel: Locator;
  readonly userEmailEntry: Locator;
  readonly domainLabel: Locator;
  readonly cancelButton: Locator;
  readonly modalCloseButton: Locator;

  constructor(page: Page) {
    this.modal = page.getByTestId('modal-user-profile');
    this.connectButton = page.getByTestId('modal-user-profile').getByTestId('do-send-request');
    this.startConversationButton = page.getByTestId('modal-user-profile').getByTestId('start-conversation');
    this.unblockButton = page.getByTestId('modal-user-profile').getByTestId('do-unblock');
    this.blockButton = page.getByRole('button', {name: 'Block…'}).getByTestId('do-block');
    this.openConversationButton = this.modal.getByRole('button', {name: 'Open conversation'}).getByTestId('go-conversation');
    this.guestChip = page.getByTestId('status-guest');
    this.connectWarning = page.getByText(/Get certainty about .*’s identity before connecting/);
    this.participantFullname = this.modal.getByTestId('status-label');
    this.participantUsername = this.modal.getByTestId('status-username');

    const emailContainer = page.locator('.enriched-fields__entry').filter({
      has: page.locator('[data-uie-name="item-enriched-key"]', {hasText: 'Email'}),
    });
    this.userEmailLabel = emailContainer.getByRole('paragraph').getByText('Email');
    this.userEmailEntry = emailContainer.getByTestId('item-enriched-value');

    const domainContainer = page.locator('.enriched-fields__entry').filter({
      has: page.locator('[data-uie-name="item-enriched-key"]', {hasText: 'Domain'}),
    });
    this.domainLabel = domainContainer.getByRole('paragraph').getByText('Domain');
    this.cancelButton = this.modal.getByRole('button', {name: 'Cancel', exact: true});
    this.modalCloseButton = this.modal.getByTestId('do-close');
  }

  async isVisible() {
    return await this.modal.isVisible();
  }

  async clickConnectButton() {
    await this.connectButton.click();
  }

  async clickStartConversation() {
    await this.startConversationButton.click();
  }
}
