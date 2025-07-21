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

export class CallingPage {
  readonly page: Page;

  readonly callCell: Locator;
  readonly acceptCallButton: Locator;
  readonly toggleVideoButton: Locator;
  readonly toggleMuteButton: Locator;
  readonly toggleScreenShareButton: Locator;
  readonly leaveCallButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.callCell = page.locator('[data-uie-name="item-call"]');
    this.acceptCallButton = this.callCell.locator('[data-uie-name="do-call-controls-call-accept"]');
    this.toggleVideoButton = this.callCell.locator('[data-uie-name="do-toggle-video"]');
    this.toggleMuteButton = this.callCell.locator('[data-uie-name="do-toggle-mute"]');
    this.toggleScreenShareButton = this.callCell.locator('[data-uie-name="do-call-controls-toggle-screenshare"]');
    this.leaveCallButton = this.callCell.locator('[data-uie-name="do-call-controls-call-leave"]');
  }

  async clickAcceptCallButton() {
    await this.acceptCallButton.click();
  }

  async clickToggleVideoButton() {
    await this.toggleVideoButton.click();
  }

  async clickToggleScreenShareButton() {
    await this.toggleScreenShareButton.click();
  }

  async clickLeaveCallButton() {
    await this.leaveCallButton.click();
  }
}
