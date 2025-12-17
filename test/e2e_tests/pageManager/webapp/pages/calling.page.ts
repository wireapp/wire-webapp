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

import {FullScreenCallPage} from './fullScreenCall.page';

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
    this.acceptCallButton = this.callCell.getByRole('button', {name: 'Accept'});
    this.leaveCallButton = this.callCell.getByRole('button', {name: 'Hang Up'});

    // Mute / Unmute control
    this.fullScreenMuteButton = page.getByRole('switch', {name: 'Microphone'});
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
    return this.callCell.waitFor({state: 'visible'});
  }

  isFullScreenVisible(): Promise<boolean> {
    return this.fullScreen.isVisible();
  }

  waitForGoFullScreen(): Promise<void> {
    return this.fullScreen.waitFor({state: 'visible'});
  }

  waitForSelfVideoThumbnail(): Promise<void> {
    return this.selfVideoThumbnail.waitFor({state: 'visible'});
  }

  selfVideoThumbnailVisible(): Promise<boolean> {
    return this.selfVideoThumbnail.isVisible();
  }

  // ─── Fullscreen Controls ────────────────────────────────────────────────

  async maximizeCell() {
    await this.goFullScreen.click();
    return FullScreenCallPage(this.page);
  }

  // ─── Mute Controls ──────────────────────────────────────────────────────

  async isSelfUserMutedInFullScreen(): Promise<boolean> {
    return this.fullScreenMuteButton.isChecked();
  }

  async muteSelfInFullScreen() {
    return await this.fullScreenMuteButton.check();
  }

  async unmuteSelfInFullScreen() {
    await this.fullScreenMuteButton.check();
  }

  isFullScreenMuteButtonVisible(): Promise<boolean> {
    return this.fullScreenMuteButton.isVisible();
  }

  // ─── Participant Verification ───────────────────────────────────────────

  async waitForParticipantNameToBeVisible(userId?: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to verify participant visibility.');
    }

    await this.page
      .locator(CallingPage.selectorForParticipantName(userId))
      .waitFor({state: 'visible', timeout: 20_000});
  }

  // ─── Mute State for Other Users ─────────────────────────────────────────

  waitForGridTileMuteIconToBeVisibleForUser(userId: string): Promise<void> {
    return this.page.locator(CallingPage.selectorForMuteIcon(userId)).waitFor({state: 'visible'});
  }

  isGridTileMuteIconVisibleForUser(userId: string): Promise<boolean> {
    return this.page.locator(CallingPage.selectorForMuteIcon(userId)).isVisible();
  }

  // ─── Dynamic Selector Generators ─────────────────────────────────────────

  static selectorForParticipantName(userId: string): string {
    return `${selectByDataAttribute('call-participant-name')}${selectByDataAttribute(userId, 'value')}`;
  }

  static selectorForMuteIcon(userId: string): string {
    return `${selectByDataAttribute('mic-icon-off')}${selectByDataAttribute(userId, 'value')}`;
  }
}
