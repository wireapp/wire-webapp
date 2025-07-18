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

export class ConversationDetailsPage {
  readonly page: Page;

  readonly conversationDetails: Locator;
  readonly guestOptionsButton: Locator;
  readonly addParticipantsButton: Locator;
  readonly membersList: Locator;

  constructor(page: Page) {
    this.page = page;

    this.conversationDetails = page.locator('#conversation-details');
    this.guestOptionsButton = this.conversationDetails.locator('[data-uie-name="go-guest-options"]');
    this.addParticipantsButton = this.conversationDetails.locator('[data-uie-name="go-add-people"]');
    this.membersList = this.conversationDetails.locator(
      '[data-uie-name="list-members"] [data-uie-name="item-user"] [data-uie-name="status-username"]',
    );
  }

  async openGuestOptions() {
    await this.guestOptionsButton.click();
  }

  async memberListContainsUser(username: string) {
    await this.membersList.first().waitFor({state: 'visible'});
    const members = await this.membersList.allTextContents();
    return members.some(member => member.includes(username));
  }

  async clickAddParticipantsButton() {
    await this.addParticipantsButton.click();
  }
}
