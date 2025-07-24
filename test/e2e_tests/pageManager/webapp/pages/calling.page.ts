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
  readonly callCell: Locator;
  readonly fullScreen: Locator;
  readonly goFullScreen: Locator;

  readonly acceptCallButton: Locator;
  readonly toggleVideoButton: Locator;
  readonly toggleMuteButton: Locator;
  readonly toggleScreenShareButton: Locator;
  readonly leaveCallButton: Locator;

  // Participant and self state
  readonly fullScreenMuteButton: Locator;
  readonly fullScreenGridTileMuteIcon: Locator;
  readonly selfVideoThumbnail: Locator;
  readonly participantNameLocator: Locator;

  constructor(page: Page) {
    this.page = page;

    // UI Elements
    this.callCell = page.locator('[data-uie-name="item-call"]');
    this.fullScreen = page.locator('.video-calling-wrapper');
    this.goFullScreen = page.locator('[data-uie-name="do-maximize-call"]');
    this.acceptCallButton = this.callCell.locator('[data-uie-name="do-call-controls-call-accept"]');
    this.leaveCallButton = this.callCell.locator('[data-uie-name="do-call-controls-call-leave"]');

    // Mute / Unmute control
    this.fullScreenMuteButton = page.locator('[data-uie-name="do-call-controls-video-call-mute"]');
    this.fullScreenGridTileMuteIcon = page.locator('[data-uie-name="mic-icon-off"]');

    this.toggleVideoButton = this.callCell.locator('[data-uie-name="do-toggle-video"]');
    this.toggleMuteButton = this.callCell.locator('[data-uie-name="do-toggle-mute"]');
    this.toggleScreenShareButton = this.callCell.locator('[data-uie-name="do-call-controls-toggle-screenshare"]');

    // Participant visibility
    this.selfVideoThumbnail = page.locator('[data-uie-name="self-video-thumbnail-wrapper"]');
    this.participantNameLocator = page.locator('[data-uie-name="call-participant-name"]');
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

  // ─── Visibility and Waits ───────────────────────────────────────────────

  isCellVisible(): Promise<boolean> {
    return this.callCell.isVisible();
  }

  waitForCell(): Promise<void> {
    return this.callCell.waitFor({state: 'visible', timeout: 5000});
  }

  isFullScreenVisible(): Promise<boolean> {
    return this.fullScreen.isVisible();
  }

  waitForGoFullScreen(): Promise<void> {
    return this.goFullScreen.waitFor({state: 'visible', timeout: 10000});
  }

  waitForSelfVideoThumbnail(): Promise<void> {
    return this.selfVideoThumbnail.waitFor({state: 'visible', timeout: 10000});
  }

  selfVideoThumbnailVisible(): Promise<boolean> {
    return this.selfVideoThumbnail.isVisible();
  }

  // ─── Fullscreen Controls ────────────────────────────────────────────────

  maximizeCell(): Promise<void> {
    return this.goFullScreen.click();
  }

  // ─── Mute Controls ──────────────────────────────────────────────────────

  async isSelfUserMutedInFullScreen(): Promise<boolean> {
    const state = await this.fullScreenMuteButton.getAttribute('data-uie-value');
    return state === 'active';
  }

  muteSelfInFullScreen(): Promise<void> {
    return this.fullScreenMuteButton.click();
  }

  unmuteSelfInFullScreen(): Promise<void> {
    return this.fullScreenMuteButton.click();
  }

  isFullScreenMuteButtonVisible(): Promise<boolean> {
    return this.fullScreenMuteButton.isVisible();
  }

  // ─── Participant Verification ───────────────────────────────────────────

  async waitForParticipantNameToBeVisible(userId?: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to verify participant visibility.');
    }

    await this.page.locator(CallingPage.selectorForParticipantName(userId)).waitFor({state: 'visible', timeout: 20000});
  }

  // ─── Mute State for Other Users ─────────────────────────────────────────

  waitForGridTileMuteIconToBeVisibleForUser(userId: string): Promise<void> {
    return this.page.locator(CallingPage.selectorForMuteIcon(userId)).waitFor({state: 'visible', timeout: 10000});
  }

  isGridTileMuteIconVisibleForUser(userId: string): Promise<boolean> {
    return this.page.locator(CallingPage.selectorForMuteIcon(userId)).isVisible();
  }

  // ─── Dynamic Selector Generators ─────────────────────────────────────────

  static selectorForParticipantName(userId: string): string {
    return `[data-uie-name="call-participant-name"][data-uie-value="${userId}"]`;
  }

  static selectorForMuteIcon(userId: string): string {
    return `[data-uie-name="mic-icon-off"][data-uie-value="${userId}"]`;
  }
}
