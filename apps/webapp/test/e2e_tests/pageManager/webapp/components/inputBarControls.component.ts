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

import {shareAssetHelper} from 'test/e2e_tests/utils/asset.util';

export const EPHEMERAL_TIMER_CHOICES = ['10 seconds', '5 minutes', '1 hour', 'Off'] as const;

export class InputBarControls {
  readonly page: Page;

  readonly shareImage: Locator;
  readonly shareFile: Locator;
  readonly ping: Locator;
  readonly setEphemeralTimer: Locator;
  readonly sendMessage: Locator;
  readonly messageInput: Locator;

  constructor(page: Page) {
    this.page = page;

    this.shareImage = page.getByTestId('do-share-image');
    this.shareFile = page.getByTestId('do-share-file');
    this.ping = page.getByTestId('do-ping');
    this.setEphemeralTimer = page.getByTestId('do-set-ephemeral-timer');
    this.sendMessage = page.getByTestId('do-send-message');
    this.messageInput = page.getByTestId('input-message');
  }

  async clickShareImage(imageFilePath: string) {
    await shareAssetHelper(imageFilePath, this.page, this.shareImage);
    await this.page.waitForTimeout(3_000); // Wait for the file to be processed
  }

  async clickShareFile(filePath: string) {
    await shareAssetHelper(filePath, this.page, this.shareFile);
    await this.page.waitForTimeout(3_000); // Wait for the file to be processed
  }

  async clickPing() {
    await this.ping.click();
  }

  async setEphemeralTimerTo(choice: (typeof EPHEMERAL_TIMER_CHOICES)[number]) {
    await this.setEphemeralTimer.click();
    const buttons = this.page.getByTestId('message-timer-menu');
    await buttons.last().waitFor({state: 'visible'});

    // Get all buttons and find the one with the matching title
    const allButtons = await buttons.all();
    for (const button of allButtons) {
      const title = await button.getAttribute('title');

      if (title === choice) {
        await button.click();
        return;
      }
    }
  }

  async setMessageInput(message: string) {
    await this.messageInput.fill(message);
  }

  async clickSendMessage() {
    await this.sendMessage.click();
  }
}
