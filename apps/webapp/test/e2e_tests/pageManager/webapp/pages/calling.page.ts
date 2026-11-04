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

import {FullScreenCallPage} from './fullScreenCall.page';
import type {User} from '../../../data/user';

type MaximizeCellResult = Promise<{
  sendReaction: (emoji: '\uD83D\uDC4D') => Promise<void>;
  getReaction: (options?: {emoji?: '\uD83D\uDC4D'; sender?: Pick<User, 'fullName'>}) => Locator;
  toggleParticipantsBtn: Locator;
  toggleHandRaise: () => Promise<void>;
  selfVideoThumbnail: Locator;
  gridTiles: Locator;
  toggleParticipantsList: () => Promise<void>;
  getCallingParticipant: (userName: string) => Locator & {
    muteIcon: Locator;
    guestIcon: Locator;
    activeSpeakerIcon: Locator;
    videoIcon: Locator;
    screenShareIcon: Locator;
    menuButton: Locator;
    openContextMenu: () => Promise<Locator & {muteButton: Locator; muteOthersButton: Locator}>;
  };
  getGridTile: (name: string) => Locator & {muteIcon: Locator; videoElement: Locator};
  goToNextPage: () => Promise<void>;
  goToPreviousPage: () => Promise<void>;
  toggleScreenShareButton: Locator;
  toggleVideoButton: Locator;
}>;

type GetGridTileResult = Locator & {muteIcon: Locator};
export class CallingPage {
  private readonly page: Page;

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
  readonly gridTiles: Locator;
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

    this.gridTiles = this.page.getByTestId('item-grid');

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

  async clickAcceptCallButton(): Promise<void> {
    await this.acceptCallButton.click();
  }

  async clickToggleVideoButton(): Promise<void> {
    await this.toggleVideoButton.click();
  }

  async clickToggleScreenShareButton(): Promise<void> {
    await this.toggleScreenShareButton.click();
  }

  async clickLeaveCallButton(): Promise<void> {
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

  async maximizeCell(): MaximizeCellResult {
    await this.goFullScreen.click();
    return FullScreenCallPage(this.page);
  }

  // ─── Mute Controls ──────────────────────────────────────────────────────

  async toggleMute(): Promise<void> {
    await this.toggleMuteButton.click();
  }

  async muteSelfInFullScreen(): Promise<void> {
    return await this.fullScreenMuteButton.click();
  }

  async unmuteSelfInFullScreen(): Promise<void> {
    await this.fullScreenMuteButton.click();
  }

  isFullScreenMuteButtonVisible(): Promise<boolean> {
    return this.fullScreenMuteButton.isVisible();
  }

  getGridTile(name: string): GetGridTileResult {
    const tile = this.gridTiles.filter({hasText: name});

    return Object.assign(tile, {
      /** Icon indicating that the given user is muted */
      muteIcon: tile.getByTestId('mic-icon-off'),
    });
  }
}
