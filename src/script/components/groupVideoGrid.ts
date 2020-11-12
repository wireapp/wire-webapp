/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import ko from 'knockout';

import type {Participant} from '../calling/Participant';
import type {Grid} from '../calling/videoGridHandler';

interface GroupVideoGripParams {
  grid: ko.PureComputed<Grid>;
  minimized: boolean;
  muted?: ko.Observable<boolean>;
  selfParticipant: Participant;
}

class GroupVideoGrid {
  private readonly grid: ko.PureComputed<Grid>;
  private readonly videoParticipants: ko.PureComputed<Participant[]>;
  private readonly minimized: boolean;
  public readonly muted: ko.Observable<boolean>;
  public readonly selfParticipant: Participant;
  public readonly dispose: () => void;
  private readonly maximizedParticipant: ko.Observable<Participant>;
  private readonly rootElement: HTMLElement;

  constructor(
    {minimized, grid, muted = ko.observable(false), selfParticipant}: GroupVideoGripParams,
    rootElement: HTMLElement,
  ) {
    this.selfParticipant = ko.unwrap(selfParticipant);
    this.grid = grid;
    this.muted = muted;
    this.maximizedParticipant = ko.observable(null);
    this.videoParticipants = ko.pureComputed(() => this.grid().grid.filter(participant => !!participant));
    this.minimized = minimized;
    this.rootElement = rootElement;
    // scale videos when the grid is updated (on the next rendering cycle)
    const gridSubscription = this.grid.subscribe(newGrid => {
      if (this.maximizedParticipant() !== null) {
        return;
      }
      this.setRowsAndColumns(rootElement, newGrid.grid.length);
    });
    this.setRowsAndColumns(rootElement, grid().grid.length);
    this.dispose = () => gridSubscription.dispose();
  }

  setRowsAndColumns(rootElement: HTMLElement, totalCount: number): void {
    const columns = Math.ceil(Math.sqrt(totalCount));
    const rows = Math.ceil(totalCount / columns);
    const gridContainer = rootElement.querySelector('.group-video-grid') as HTMLElement;
    gridContainer.style.setProperty('--rows', `${rows}`);
    gridContainer.style.setProperty('--columns', `${columns}`);
  }

  hasBlackBackground(): boolean {
    const gridElementsCount = this.grid().grid.filter(participant => !!participant).length;
    return this.minimized && gridElementsCount > 1;
  }

  doubleClickedOnVideo = (_: GroupVideoGrid, event: MouseEvent): void => {
    if (this.maximizedParticipant() !== null) {
      this.maximizedParticipant(null);
      this.setRowsAndColumns(this.rootElement, this.grid().grid.length);
      return;
    }
    const target = event.currentTarget as HTMLElement;
    const {userId, clientId} = target.dataset;
    const participant = this.videoParticipants().find(participant => participant.doesMatchIds(userId, clientId));
    this.maximizedParticipant(participant);
    this.setRowsAndColumns(this.rootElement, 1);
  };
}

ko.components.register('group-video-grid', {
  template: `
    <div class="group-video">
      <div class="group-video-grid" data-bind="
        foreach: {data: maximizedParticipant() ? [maximizedParticipant()] : grid().grid, as: 'participant', noChildContext: true},
        css: {'group-video-grid--black-background': hasBlackBackground()}"
      >
        <!-- ko if: participant -->
          <div class="group-video-grid__element" data-bind="	
              attr: {'data-user-id': participant.user.id, 'data-client-id': participant.clientId},	
              event: {dblclick: doubleClickedOnVideo}"
            data-uie-name="item-grid"
          >
            <video class="group-video-grid__element-video" autoplay playsinline
              data-bind="
                sourceStream: participant.videoStream(),
                css: {'group-video-grid__element-video--contain': participant.sharesScreen(), mirror: participant === selfParticipant && participant.sharesCamera()}">
            </video>
            <!-- ko if: !minimized -->
              <div class="group-video-grid__element__label">
                <!-- ko if: participant.isMuted() -->
                  <mic-off-icon class="group-video-grid__element__label__icon"></mic-off-icon>
                <!-- /ko -->
                <!-- ko ifnot: participant.isMuted() -->
                  <mic-on-icon class="group-video-grid__element__label__icon"></mic-on-icon>
                <!-- /ko -->
                <span class="group-video-grid__element__label__name" data-bind="text: participant.user.name()"></span>
              </div>
            <!-- /ko -->
            <!-- ko if: participant.hasPausedVideo() -->
              <div class="group-video-grid__pause-overlay" data-bind="switchBackground: null">
                <div class="background">
                  <div class="background-image"></div>
                  <div class="background-darken"></div>
                </div>
                <div class="group-video-grid__pause-overlay__label" data-bind="text: t('videoCallPaused'), css: {'group-video-grid__pause-overlay__label--minimized': minimized}" data-uie-name="status-video-paused"></div>
              </div>
            <!-- /ko -->
          </div>
        <!-- /ko -->
      </div>
      <!-- ko if: grid().thumbnail && grid().thumbnail.videoStream() && !maximizedParticipant() -->
        <div class="group-video__thumbnail" data-bind="css: {'group-video__thumbnail--minimized': minimized}">
          <video class="group-video__thumbnail-video" autoplay playsinline data-uie-name="self-video-thumbnail" data-bind="css: {'group-video__thumbnail--minimized': minimized, 'mirror': grid().thumbnail.hasActiveVideo() && !grid().thumbnail.sharesScreen()}, sourceStream: grid().thumbnail.videoStream()">
          </video>
          <!-- ko if: muted() -->
            <div class="group-video-grid__mute-overlay" data-uie-name="status-call-audio-muted">
              <mic-off-icon></mic-off-icon>
            </div>
          <!-- /ko -->
        </div>
      <!-- /ko -->
    </div>
  `,
  viewModel: {
    createViewModel: (params: GroupVideoGripParams, componentInfo: ko.components.ComponentInfo) =>
      new GroupVideoGrid(params, componentInfo.element as HTMLElement),
  },
});
