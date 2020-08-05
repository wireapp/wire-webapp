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

import {afterRender} from 'Util/util';

import type {Participant} from '../calling/Participant';
import {VideoFillMode} from '../calling/Participant';
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

  constructor(
    {minimized, grid, muted = ko.observable(false), selfParticipant}: GroupVideoGripParams,
    rootElement: HTMLElement,
  ) {
    this.selfParticipant = ko.unwrap(selfParticipant);
    this.scaleVideos = this.scaleVideos.bind(this, rootElement);
    this.grid = grid;
    this.muted = muted;
    this.videoParticipants = ko.pureComputed(() => this.grid().grid.filter(participant => !!participant));

    this.minimized = minimized;
    // scale videos when the grid is updated (on the next rendering cycle)
    const gridSubscription = this.grid.subscribe(newGrid => {
      this.setRowsAndColumns(rootElement, newGrid.grid.length);
      afterRender(this.scaleVideos);
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

  toggleContain(element: HTMLVideoElement, videoFillMode: VideoFillMode): void {
    element.classList.toggle('group-video-grid__element-video--contain', videoFillMode === VideoFillMode.CONTAIN);
  }

  scaleVideos(rootElement: HTMLElement): void {
    const gridElements = Array.from(rootElement.querySelectorAll('.group-video-grid__element'));
    gridElements.forEach((element: HTMLElement) => {
      const videoElement = element.querySelector('video');
      const {userId, clientId} = element.dataset;
      const participant = this.videoParticipants().find(participant => participant.doesMatchIds(userId, clientId));
      if (!participant) {
        return;
      }
      if (participant.videoFillMode() === VideoFillMode.UNSET) {
        participant.videoFillMode(participant.sharesScreen() ? VideoFillMode.CONTAIN : VideoFillMode.COVER);
      }
      afterRender(() => this.toggleContain(videoElement, participant.videoFillMode()));
    });
  }

  doubleClickedOnVideo = (_: GroupVideoGrid, event: MouseEvent): void => {
    const target = event.currentTarget as HTMLElement;
    const childVideo = target.querySelector('video');
    const {userId, clientId} = target.dataset;
    const participant = this.videoParticipants().find(participant => participant.doesMatchIds(userId, clientId));
    const isContain = participant.videoFillMode() === VideoFillMode.CONTAIN;
    participant.videoFillMode(isContain ? VideoFillMode.COVER : VideoFillMode.CONTAIN);
    this.toggleContain(childVideo, participant.videoFillMode());
  };
}

ko.components.register('group-video-grid', {
  template: `
    <div class="group-video">
      <div class="group-video-grid" data-bind="
        foreach: {data: grid().grid, as: 'participant', noChildContext: true, afterRender: scaleVideos},
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
      <!-- ko if: grid().thumbnail && grid().thumbnail.videoStream() -->
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
