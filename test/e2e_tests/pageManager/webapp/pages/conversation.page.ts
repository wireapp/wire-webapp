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
  readonly watermark: Locator;
  readonly timerMessageButton: Locator;
  readonly timerTenSecondsButton: Locator;
  readonly openGroupInformationViaName: Locator;

  constructor(page: Page) {
    this.page = page;

    this.createGroupButton = page.locator(selectByDataAttribute('go-create-group'));
    this.createGroupModal = page.locator(selectByDataAttribute('group-creation-label'));
    this.createGroupNameInput = this.createGroupModal.locator(selectByDataAttribute('enter-group-name'));
    this.createGroupSubmitButton = this.createGroupModal.locator(selectByDataAttribute('submit'));
    this.messageInput = page.locator(selectByDataAttribute('input-message'));
    this.watermark = page.locator(`${selectByDataAttribute('no-conversation')} svg`);
    this.sendMessageButton = page.locator(selectByDataAttribute('do-send-message'));
    this.openGroupInformationViaName = page.locator(selectByDataAttribute('status-conversation-title-bar-label'));
    this.timerMessageButton = page.locator(selectByDataAttribute('do-set-ephemeral-timer'));
    this.timerTenSecondsButton = page.locator(selectById('btn-10-seconds'));
  }

  async isConversationOpen(conversationName: string) {
    return (
      (await this.page.locator(selectByDataAttribute('status-conversation-title-bar-label')).textContent()) ===
      conversationName
    );
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

  async startCall() {
    const startCallButton = this.page.locator('[data-uie-name="do-call"]');
    await startCallButton.click();
  }

  async isConversationReadonly() {
    await this.messageInput.waitFor({state: 'detached'});
  }

  async isMessageInputVisible() {
    return await this.messageInput.isVisible();
  }

  async openGroupInformation() {
    await this.openGroupInformationViaName.click();
  }
}
