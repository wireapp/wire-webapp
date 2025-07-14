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

  readonly cell: Locator;
  readonly fullScreen: Locator;
  readonly goFullScreen: Locator;
  readonly pickUpIncomingCallButton: Locator;
  readonly fullScreenMuteButton: Locator;
  readonly fullScreenGridTileMuteIcon: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cell = page.locator('[data-uie-name="item-call"]');
    this.fullScreen = page.locator('[data-uie-name="modal-user-profile"] [data-uie-name="do-send-request"]');
    this.goFullScreen = page.locator('[data-uie-name="do-maximize-call"]');
    this.fullScreenMuteButton = page.locator('[data-uie-name="do-call-controls-video-call-mute"]');
    this.fullScreenGridTileMuteIcon = page.locator('[data-uie-name="mic-icon-off"]');
    this.pickUpIncomingCallButton = page.locator('[data-uie-name="do-call-controls-call-accept"]');
  }

  async isCellVisible() {
    return this.cell.isVisible();
  }

  async isFullScreenVisible() {
    return this.fullScreen.isVisible();
  }

  async waitForCell() {
    await this.cell.waitFor({state: 'visible', timeout: 5000});
  }

  async maximizeCell() {
    await this.goFullScreen.click();
  }

  async isSelfUserMutedInFullScreen() {
    const isMuted = await this.fullScreenMuteButton.getAttribute('data-uie-value');
    return isMuted === 'active';
  }

  async muteSelfInFullScreen() {
    await this.fullScreenMuteButton.click();
  }

  async unmuteSelfInFullScreen() {
    await this.fullScreenMuteButton.click();
  }

  async isFullScreenMuteButtonVisible() {
    return this.fullScreenMuteButton.isVisible();
  }

  // Check if the mute icon for a specific user is visible in the full screen grid tile
  async waitForGridTileMuteIconToBeVisibleForUser(userName: string) {
    const userMuteIcon = this.fullScreenGridTileMuteIcon.locator(`[data-uie-user-name="${userName}"]`);
    await userMuteIcon.waitFor({state: 'visible', timeout: 5000});
    return userMuteIcon;
  }

  async isGridTileMuteIconVisibleForUser(userName: string) {
    const userMuteIcon = this.fullScreenGridTileMuteIcon.locator(`[data-uie-user-name="${userName}"]`);
    return await userMuteIcon.isVisible();
  }

  async pickUpIncomingCall() {
    await this.pickUpIncomingCallButton.click();
  }
}
