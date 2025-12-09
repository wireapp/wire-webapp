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

import {selectById, selectByDataAttribute} from 'test/e2e_tests/utils/selector.util';
import {escapeHtml} from 'test/e2e_tests/utils/userDataProcessor';

import {User} from '../../../data/user';

export class ConversationListPage {
  readonly page: Page;

  readonly blockConversationMenuButton: Locator;
  readonly createGroupButton: Locator;
  readonly connectWithPeopleButton: Locator;
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

  constructor(page: Page) {
    this.page = page;

    this.blockConversationMenuButton = page.locator(
      `${selectById('btn-block')}${selectByDataAttribute('conversation-list-options-menu')}`,
    );

    this.connectWithPeopleButton = page.locator('[data-uie-name="connect-with-new-users"]');
    this.pendingConnectionRequest = page.locator('[data-uie-name="connection-request"]');
    this.createGroupButton = page.locator(
      `${selectByDataAttribute('conversation-list-header')} ${selectByDataAttribute('go-create-group')}`,
    );
    this.leaveConversationButton = page.locator(selectByDataAttribute('conversation-leave'));
    this.searchConversationsInput = page.locator(selectByDataAttribute('search-conversations'));
    this.archiveConversationMenuButton = page.locator(selectById('btn-archive'));
    this.unarchiveConversationMenuButton = page.locator(selectById('btn-unarchive'));
    this.blockedChip = page.locator(`span[data-uie-name="status-label"] + span`);
    this.unblockConversationMenuButton = page.locator(
      `${selectById('btn-unblock')}${selectByDataAttribute('conversation-list-options-menu')}`,
    );
    this.moveConversationButton = page.locator(selectById('btn-move-to'));
    this.moveToMenu = page.locator('ul.ctx-menu', {
      has: page.locator(selectById('btn-create-new-folder')),
    });
    this.createNewFolderButton = this.moveToMenu.locator(selectById('btn-create-new-folder'));
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

  async doesConversationHasMentionIndicator(conversationName: string) {
    const mentionIndicator = this.getConversationLocator(conversationName).locator(
      selectByDataAttribute('status-mention'),
    );
    await mentionIndicator.waitFor({state: 'visible'});
    return await mentionIndicator.isVisible();
  }

  async openConversation(conversationName: string) {
    await this.getConversationLocator(conversationName).first().click();
  }

  async openPendingConnectionRequest() {
    await this.pendingConnectionRequest.click();
  }

  async clickConversationOptions(conversationName: string) {
    await this.getConversationLocator(conversationName).locator(selectByDataAttribute('go-options')).first().click();
  }

  async clickConnectWithPeople() {
    await this.connectWithPeopleButton.click();
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

  getConversationLocator(conversationName: string) {
    return this.page.locator(
      `${selectByDataAttribute('item-conversation')}${selectByDataAttribute(escapeHtml(conversationName), 'value')}`,
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

  async getUserAvatarWrapper(user: User): Promise<Locator> {
    return this.getConversationLocator(user.fullName).locator(selectByDataAttribute('element-avatar-user'));
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
