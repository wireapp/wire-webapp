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

  constructor(page: Page) {
    this.page = page;

    this.createGroupButton = page.locator('[data-uie-name="go-create-group"]');
    this.createGroupModal = page.locator('[data-uie-name="group-creation-label"]');
    this.createGroupNameInput = this.createGroupModal.locator('[data-uie-name="enter-group-name"]');
    this.createGroupSubmitButton = this.createGroupModal.locator('[data-uie-name="submit"]');
    this.messageInput = page.locator('[data-uie-name="input-message"]');
  }

  async isConversationVisible(conversationName: string) {
    const conversation = this.page.locator(`[data-uie-name='item-conversation'][data-uie-value='${conversationName}']`);
    return await conversation.isVisible();
  }
}
