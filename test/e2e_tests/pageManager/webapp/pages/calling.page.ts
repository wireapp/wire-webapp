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

  // Core call UI elements
  readonly cell: Locator;
  readonly fullScreen: Locator;
  readonly goFullScreen: Locator;
  readonly pickUpIncomingCallButton: Locator;

  // Participant and self state
  readonly fullScreenMuteButton: Locator;
  readonly fullScreenGridTileMuteIcon: Locator;
  readonly selfVideoThumbnail: Locator;
  readonly participantNameLocator: Locator;

  constructor(page: Page) {
    this.page = page;

    // UI Elements
    this.cell = page.locator('[data-uie-name="item-call"]');
    this.fullScreen = page.locator('.video-calling-wrapper');
    this.goFullScreen = page.locator('[data-uie-name="do-maximize-call"]');
    this.pickUpIncomingCallButton = page.locator('[data-uie-name="do-call-controls-call-accept"]');

    // Mute / Unmute controls
    this.fullScreenMuteButton = page.locator('[data-uie-name="do-call-controls-video-call-mute"]');
    this.fullScreenGridTileMuteIcon = page.locator('[data-uie-name="mic-icon-off"]');

    // Participant visibility
    this.selfVideoThumbnail = page.locator('[data-uie-name="self-video-thumbnail-wrapper"]');
    this.participantNameLocator = page.locator('[data-uie-name="call-participant-name"]');
  }

  // Visibility and Waits

  async isCellVisible(): Promise<boolean> {
    return this.cell.isVisible();
  }

  async waitForCell(): Promise<void> {
    await this.cell.waitFor({state: 'visible', timeout: 5000});
  }

  async isFullScreenVisible(): Promise<boolean> {
    return this.fullScreen.isVisible();
  }

  waitForGoFullScreen(): Promise<void> {
    return this.goFullScreen.waitFor({state: 'visible', timeout: 10000});
  }

  async waitForSelfVideoThumbnail(): Promise<void> {
    await this.selfVideoThumbnail.waitFor({state: 'visible', timeout: 10000});
  }

  selfVideoThumbnailVisible(): Promise<boolean> {
    return this.selfVideoThumbnail.isVisible();
  }

  // Fullscreen Controls

  async maximizeCell(): Promise<void> {
    await this.goFullScreen.click();
  }

  async pickUpIncomingCall(): Promise<void> {
    await this.pickUpIncomingCallButton.click();
  }

  // Mute Controls

  async isSelfUserMutedInFullScreen(): Promise<boolean> {
    const state = await this.fullScreenMuteButton.getAttribute('data-uie-value');
    return state === 'active';
  }

  async muteSelfInFullScreen(): Promise<void> {
    await this.fullScreenMuteButton.click();
  }

  async unmuteSelfInFullScreen(): Promise<void> {
    await this.fullScreenMuteButton.click();
  }

  async isFullScreenMuteButtonVisible(): Promise<boolean> {
    return this.fullScreenMuteButton.isVisible();
  }

  // Participant Verification

  async waitForParticipantNameToBeVisible(userId?: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to verify participant visibility.');
    }

    await this.page
      .locator(`[data-uie-name="call-participant-name"][data-uie-value="${userId}"]`)
      .waitFor({state: 'visible', timeout: 20000});
  }

  // Mute State for Other Users

  async waitForGridTileMuteIconToBeVisibleForUser(userId: string): Promise<void> {
    await this.page
      .locator(`[data-uie-name="mic-icon-off"][data-uie-user-id="${userId}"]`)
      .waitFor({state: 'visible', timeout: 10000});
  }

  async isGridTileMuteIconVisibleForUser(userId: string): Promise<boolean> {
    return this.page.locator(`[data-uie-name="mic-icon-off"][data-uie-user-id="${userId}"]`).isVisible();
  }
}
