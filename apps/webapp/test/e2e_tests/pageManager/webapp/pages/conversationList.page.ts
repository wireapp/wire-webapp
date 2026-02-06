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

import {User} from 'test/e2e_tests/data/user';

export class ConversationListPage {
  readonly page: Page;

  readonly blockConversationMenuButton: Locator;
  readonly createGroupButton: Locator;
  readonly pendingConnectionRequest: Locator;
  readonly leaveConversationButton: Locator;
  readonly searchConversationsInput: Locator;
  readonly archiveConversationMenuButton: Locator;
  readonly unarchiveConversationMenuButton: Locator;
  readonly blockedChip: Locator;
  readonly unblockConversationMenuButton: Locator;
  readonly moveConversationButton: Locator;
  readonly moveToMenu: Locator;
  readonly createNewFolderButton: Locator;
  readonly conversationListHeaderTitle: Locator;
  readonly joinCallButton: Locator;
  readonly clearContentButton: Locator;
  readonly mutedConversationBadge: Locator;

  constructor(page: Page) {
    this.page = page;

    this.blockConversationMenuButton = page.getByRole('menu').getByRole('button', {name: 'Block'});
    this.pendingConnectionRequest = page.locator('[data-uie-name="connection-request"]');
    this.createGroupButton = page.getByTestId('conversation-list-header').getByTestId('go-create-group');
    this.leaveConversationButton = page.getByTestId('conversation-leave');
    this.searchConversationsInput = page.getByTestId('search-conversations');
    this.archiveConversationMenuButton = page.locator('#btn-archive');
    this.unarchiveConversationMenuButton = page.locator('#btn-unarchive');
    this.blockedChip = page.locator(`span[data-uie-name="status-label"] + span`);
    this.unblockConversationMenuButton = page
      .getByTestId('conversation-list-options-menu')
      .and(page.locator('#btn-unblock'));
    this.moveConversationButton = page.getByRole('menu').getByRole('button', {name: 'Move to'});
    this.moveToMenu = page.getByRole('menu');
    this.createNewFolderButton = this.moveToMenu.getByRole('button', {name: 'Create new folder'});
    this.conversationListHeaderTitle = page.locator('[data-uie-name="conversation-list-header-title"]');
    this.joinCallButton = page.getByRole('button', {name: 'Join'});
    this.clearContentButton = page.getByRole('button', {name: 'Clear content'});
    this.mutedConversationBadge = page.locator('[data-uie-name="status-silence"]');
  }

  async isConversationItemVisible(conversationName: string) {
    const conversation = this.getConversationLocator(conversationName);
    await conversation.waitFor({state: 'visible'});
    return await conversation.isVisible();
  }

  async isConversationBlocked(conversationName: string) {
    return await this.getConversationLocator(conversationName).getByTestId('status-blocked').isVisible();
  }

  async doesConversationHasMentionIndicator(conversationName: string) {
    const mentionIndicator = this.getConversationLocator(conversationName).getByTestId('status-mention');
    await mentionIndicator.waitFor({state: 'visible'});
    return await mentionIndicator.isVisible();
  }

  async openConversation(conversationName: string, options?: Parameters<typeof this.getConversationLocator>[1]) {
    await this.getConversationLocator(conversationName, options).click();
  }

  async openPendingConnectionRequest() {
    await this.pendingConnectionRequest.click();
  }

  async clickConversationOptions(conversationName: string) {
    await this.getConversationLocator(conversationName).getByTestId('go-options').first().click();
  }

  async clickBlockConversation() {
    await this.blockConversationMenuButton.click();
  }

  async archiveConversation() {
    await this.archiveConversationMenuButton.click();
  }

  async unarchiveConversation() {
    await this.unarchiveConversationMenuButton.click();
  }

  async clickCreateGroup() {
    await this.createGroupButton.click();
  }

  /**
   * Get a locator for a specific conversation in the list
   * @param conversationName Name of the conversation to search for
   * @param options.protocol Only locate conversations matching this protocol (mls only works for 1on1 conversations as groups still use proteus) - Default: "mls"
   */
  getConversationLocator(conversationName: string, options?: {protocol?: 'mls' | 'proteus'}) {
    const conversation = this.page.getByTestId('item-conversation').filter({hasText: conversationName});

    if (options?.protocol) {
      return conversation.and(this.page.locator(`[data-protocol="${options.protocol}"]`));
    }

    return conversation;
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

  async getUserAvatarWrapper(user: User): Promise<Locator> {
    return this.getConversationLocator(user.fullName).getByTestId('element-avatar-user');
  }

  async clickUnblockConversation() {
    await this.unblockConversationMenuButton.click();
  }

  getRemoveConversationFromFolderButton(folderName: string) {
    return this.page.getByRole('button', {name: `Remove from "${folderName}"`});
  }

  getMoveToFolderButton(folderName: string) {
    return this.moveToMenu.getByRole('button', {name: folderName, exact: true});
  }
}
