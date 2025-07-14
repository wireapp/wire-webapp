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

import {escapeHtml} from '../utils/userDataProcessor';

export class ConversationListPage {
  readonly page: Page;

  readonly blockConversationMenuButton: Locator;
  readonly createGroupButton: Locator;
  readonly leaveConversationButton: Locator;
  readonly searchConversationsInput: Locator;

  constructor(page: Page) {
    this.page = page;

    this.blockConversationMenuButton = page.locator('#btn-block[data-uie-name="conversation-list-options-menu"]');
    this.createGroupButton = page.locator(
      '[data-uie-name="conversation-list-header"] [data-uie-name="go-create-group"]',
    );
    this.leaveConversationButton = page.locator('[data-uie-name="conversation-leave"]');
    this.searchConversationsInput = page.locator('[data-uie-name="search-conversations"]');
  }

  async isConversationItemVisible(conversationName: string) {
    const conversation = this.getConversationLocator(conversationName);
    await conversation.waitFor({state: 'visible'});
    return await conversation.isVisible();
  }

  async isConversationBlocked(conversationName: string) {
    return await this.getConversationLocator(conversationName).locator('[data-uie-name="status-blocked"]').isVisible();
  }

  async openConversation(conversationName: string) {
    await this.getConversationLocator(conversationName).click();
  }

  async clickConversationOptions(conversationName: string) {
    // Click on the conversation options button
    await this.getConversationLocator(conversationName).locator('[data-uie-name="go-options"]').click();
  }

  async clickBlockConversation() {
    await this.blockConversationMenuButton.click();
  }

  async clickCreateGroup() {
    await this.createGroupButton.click();
  }

  private getConversationLocator(conversationName: string) {
    return this.page.locator(`[data-uie-name='item-conversation'][data-uie-value='${escapeHtml(conversationName)}']`);
  }

  async openContextMenu(conversationName: string) {
    await this.getConversationLocator(conversationName).click();
    await this.getConversationLocator(conversationName).click({button: 'right'});
  }

  async leaveConversation() {
    await this.leaveConversationButton.click();
  }

  async searchConversation(conversationName: string) {
    await this.searchConversationsInput.fill(conversationName);
    await this.openConversation(conversationName);
  }
}
