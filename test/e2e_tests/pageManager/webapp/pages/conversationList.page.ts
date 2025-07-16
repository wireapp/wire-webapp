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

import {escapeHtml} from 'test/e2e_tests/utils/userDataProcessor';
import {selectById, selectByDataAttribute} from 'test/e2e_tests/utils/useSelector';

export class ConversationListPage {
  readonly page: Page;

  readonly blockConversationMenuButton: Locator;
  readonly createGroupButton: Locator;
  readonly leaveConversationButton: Locator;
  readonly searchConversationsInput: Locator;

  constructor(page: Page) {
    this.page = page;

    this.blockConversationMenuButton = page.locator(
      `${selectById('btn-block')}${selectByDataAttribute('conversation-list-options-menu')}`,
    );
    this.createGroupButton = page.locator(
      `${selectByDataAttribute('conversation-list-header')} ${selectByDataAttribute('go-create-group')}`,
    );
    this.leaveConversationButton = page.locator(selectByDataAttribute('conversation-leave'));
    this.searchConversationsInput = page.locator(selectByDataAttribute('search-conversations'));
  }

  async isConversationItemVisible(conversationName: string) {
    const conversation = this.getConversationLocator(conversationName);
    await conversation.waitFor({state: 'visible'});
    return await conversation.isVisible();
  }

  async isConversationBlocked(conversationName: string) {
    return await this.getConversationLocator(conversationName)
      .locator(selectByDataAttribute('status-blocked'))
      .isVisible();
  }

  async openConversation(conversationName: string) {
    await this.getConversationLocator(conversationName).click();
  }

  async clickConversationOptions(conversationName: string) {
    await this.getConversationLocator(conversationName).locator(selectByDataAttribute('go-options')).click();
  }

  async clickBlockConversation() {
    await this.blockConversationMenuButton.click();
  }

  async clickCreateGroup() {
    await this.createGroupButton.click();
  }

  private getConversationLocator(conversationName: string) {
    return this.page.locator(
      `${selectByDataAttribute('item-conversation')}[data-uie-value='${escapeHtml(conversationName)}']`,
    );
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
