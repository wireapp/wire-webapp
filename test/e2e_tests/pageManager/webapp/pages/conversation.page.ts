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

import {selectByDataAttribute, selectById, selectByClass} from 'test/e2e_tests/utils/useSelector';

export class ConversationPage {
  readonly page: Page;

  readonly createGroupModal: Locator;
  readonly createGroupButton: Locator;
  readonly createGroupNameInput: Locator;
  readonly createGroupSubmitButton: Locator;
  readonly messageInput: Locator;
  readonly sendMessageButton: Locator;
  readonly conversationTitle: Locator;
  readonly watermark: Locator;
  readonly timerMessageButton: Locator;
  readonly timerTenSecondsButton: Locator;
  readonly openGroupInformationViaName: Locator;
  readonly membersList: Locator;
  readonly adminsList: Locator;
  readonly leaveConversationButton: Locator;
  readonly makeAdminToggle: Locator;
  readonly removeUserButton: Locator;
  readonly addMemberButton: Locator;
  readonly systemMessages: Locator;
  readonly callButton: Locator;
  readonly conversationInfoButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.createGroupButton = page.locator(selectByDataAttribute('go-create-group'));
    this.createGroupModal = page.locator(selectByDataAttribute('group-creation-label'));
    this.createGroupNameInput = this.createGroupModal.locator(selectByDataAttribute('enter-group-name'));
    this.createGroupSubmitButton = this.createGroupModal.locator(selectByDataAttribute('submit'));
    this.messageInput = page.locator(selectByDataAttribute('input-message'));
    this.watermark = page.locator(`${selectByDataAttribute('no-conversation')} svg`);
    this.sendMessageButton = page.locator(selectByDataAttribute('do-send-message'));
    this.conversationTitle = page.locator('[data-uie-name="status-conversation-title-bar-label"]');
    this.openGroupInformationViaName = page.locator(selectByDataAttribute('status-conversation-title-bar-label'));
    this.timerMessageButton = page.locator(selectByDataAttribute('do-set-ephemeral-timer'));
    this.timerTenSecondsButton = page.locator(selectById('btn-10-seconds'));
    this.membersList = page.locator(selectByDataAttribute('list-members'));
    this.adminsList = page.locator(selectByDataAttribute('list-admins'));
    this.leaveConversationButton = page.locator(selectByDataAttribute('do-leave-item-text'));
    this.makeAdminToggle = page.locator(selectByDataAttribute('do-allow-admin'));
    this.removeUserButton = page.locator(selectByDataAttribute('do-remove-item-text'));
    this.addMemberButton = page.locator(selectByDataAttribute('go-add-people'));
    this.systemMessages = page.locator(
      `${selectByDataAttribute('item-message')}${selectByClass('system-message')} ${selectByClass('message-header')}`,
    );
    this.callButton = page.locator(selectByDataAttribute('do-call'));
    this.conversationInfoButton = page.locator(selectByDataAttribute('do-open-info'));
  }

  async isConversationOpen(conversationName: string) {
    return (
      (await this.page.locator(selectByDataAttribute('status-conversation-title-bar-label')).textContent()) ===
      conversationName
    );
  }

  async clickConversationTitle() {
    await this.conversationTitle.click();
  }

  async clickConversationInfoButton() {
    await this.conversationInfoButton.click();
  }

  async clickCallButton() {
    await this.callButton.click();
  }

  async isWatermarkVisible() {
    return await this.watermark.isVisible();
  }

  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    await this.messageInput.press('Enter');
  }

  async createGroup(groupName: string) {
    await this.createGroupButton.click();
    await this.createGroupNameInput.fill(groupName);
    await this.createGroupSubmitButton.click();
  }

  async enableAutoDeleteMessages() {
    await this.timerMessageButton.click();
    await this.timerTenSecondsButton.click();
  }

  async sendMention(memberId: string) {
    await this.messageInput.fill(`@`);
    await this.page
      .locator(`${selectByDataAttribute('item-mention-suggestion')}[data-uie-value="${memberId}"]`)
      .click({timeout: 1000});

    await this.messageInput.press('Enter');
  }

  async isMessageVisible(messageText: string) {
    // Trying multiple times for the message to appear
    for (let i = 0; i < 10; i++) {
      const locator = this.page.locator(
        `${selectByDataAttribute('item-message')} ${selectByClass('message-body')}:not(:has(p${selectByClass('text-foreground')}))`,
      );

      // Wait for at least one matching element to appear (optional timeout can be set)
      await locator.first().waitFor({state: 'visible'});

      // Then get all matching elements
      const messages = await locator.all();

      if (messages.length === 0) {
        continue;
      }

      for (const message of messages) {
        const messageTextContent = await message.textContent();
        if (messageTextContent !== messageText) {
          continue;
        }
        return true;
      }
      await this.page.waitForTimeout(500); // Wait for 0.5 second before next attempt
    }

    return false;
  }

  async isSystemMessageVisible(messageText: string) {
    await this.systemMessages.filter({hasText: messageText}).first().waitFor({state: 'visible', timeout: 5000});
    return true;
  }

  async isConversationReadonly() {
    await this.messageInput.waitFor({state: 'detached'});
  }

  async isMessageInputVisible() {
    return await this.messageInput.isVisible();
  }

  async toggleGroupInformation() {
    await this.openGroupInformationViaName.click();
  }

  async isUserGroupMember(name: string) {
    return this.membersList.locator(`${selectByDataAttribute('item-user')}[data-uie-value="${name}"]`).isVisible();
  }

  async isUserGroupAdmin(name: string) {
    await this.adminsList
      .locator(`${selectByDataAttribute('item-user')}[data-uie-value="${name}"]`)
      .waitFor({state: 'visible'});
    return true;
  }

  async makeUserAdmin(name: string) {
    await this.membersList.locator(`[data-uie-value="${name}"]`).click();
    return this.makeAdminToggle.click();
  }

  async removeMemberFromGroup(name: string) {
    await this.membersList.locator(`[data-uie-value="${name}"]`).click();
    return this.removeUserButton.click();
  }

  async removeAdminFromGroup(name: string) {
    await this.adminsList.locator(`[data-uie-value="${name}"]`).click();
    return this.removeUserButton.click();
  }

  async leaveConversation() {
    await this.leaveConversationButton.click();
  }

  async clickAddMemberButton() {
    await this.addMemberButton.click();
  }
}
