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

import {selectByDataAttribute} from 'test/e2e_tests/utils/selector.util';

export const EPHEMERAL_TIMER_CHOICES = ['10 seconds', '5 minutes', '1 hour', 'Off'] as const;

export class InputBarControls {
  readonly page: Page;

  readonly shareImage: Locator;
  readonly shareFile: Locator;
  readonly ping: Locator;
  readonly setEphemeralTimer: Locator;
  readonly sendMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.shareImage = page.locator(`${selectByDataAttribute('do-share-image')}`);
    this.shareFile = page.locator(`${selectByDataAttribute('do-share-file')}`);
    this.ping = page.locator(`${selectByDataAttribute('do-ping')}`);
    this.setEphemeralTimer = page.locator(`${selectByDataAttribute('do-set-ephemeral-timer')}`);
    this.sendMessage = page.locator(`${selectByDataAttribute('do-send-message')}`);
  }

  private shareFileHelper = async (filePath: string) => {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.shareFile.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath, {timeout: 10_000});
  };

  async clickShareImage(imageFilePath: string) {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.shareImage.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(imageFilePath, {timeout: 10_000});
  }

  async clickShareFile(filePath: string) {
    return await this.shareFileHelper(filePath);
  }

  async clickPing() {
    await this.ping.click();
  }

  async setEphemeralTimerTo(choice: (typeof EPHEMERAL_TIMER_CHOICES)[number]) {
    await this.setEphemeralTimer.click();
    const buttons = this.page.locator(selectByDataAttribute('message-timer-menu'));
    await buttons.last().waitFor({state: 'visible', timeout: 10000});

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

  async clickSendMessage() {
    await this.sendMessage.click({timeout: 10000});
  }
}
