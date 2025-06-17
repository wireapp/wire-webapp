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

export class ConversationPage {
  readonly page: Page;

  readonly createGroupModal: Locator;
  readonly createGroupButton: Locator;
  readonly createGroupNameInput: Locator;
  readonly createGroupSubmitButton: Locator;
  readonly messageInput: Locator;
  readonly sendMessageButton: Locator;
  readonly watermark: Locator;

  constructor(page: Page) {
    this.page = page;

    this.createGroupButton = page.locator('[data-uie-name="go-create-group"]');
    this.createGroupModal = page.locator('[data-uie-name="group-creation-label"]');
    this.createGroupNameInput = this.createGroupModal.locator('[data-uie-name="enter-group-name"]');
    this.createGroupSubmitButton = this.createGroupModal.locator('[data-uie-name="submit"]');
    this.messageInput = page.locator('[data-uie-name="input-message"]');
    this.watermark = page.locator('[data-uie-name="no-conversation"] svg');
    this.sendMessageButton = page.locator('[data-uie-name="do-send-message"]');
  }

  async isConversationOpen(conversationName: string) {
    return (
      (await this.page.locator(`[data-uie-name='status-conversation-title-bar-label']`).textContent()) ===
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

  async isMessageVisible(messageText: string) {
    // Trying multiple times for the message to appear
    for (let i = 0; i < 30; i++) {
      await this.page.waitForTimeout(500); // Wait for 0.5 second before checking
      const messages = await this.page.locator(`[data-uie-name='item-message'] .message-body`).all();
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
    }

    return false;
  }
}
