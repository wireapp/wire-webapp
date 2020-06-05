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
import type {Grid} from '../calling/videoGridHandler';

interface GroupVideoGripParams {
  grid: ko.PureComputed<Grid>;
  minimized: boolean;
  muted?: ko.Observable<boolean>;
  selfUserId: string;
}

class GroupVideoGrid {
  private readonly grid: ko.PureComputed<Grid>;
  private readonly videoParticipants: ko.PureComputed<Participant[]>;
  private readonly minimized: boolean;
  public readonly muted: ko.Observable<boolean>;
  public readonly selfUserId: string;
  public readonly dispose: () => void;

  constructor({minimized, grid, muted, selfUserId}: GroupVideoGripParams, rootElement: HTMLElement) {
    this.selfUserId = ko.unwrap(selfUserId);
    this.scaleVideos = this.scaleVideos.bind(this, rootElement);
    this.grid = grid;
    this.muted = muted || ko.observable(false);
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

  toggleContain(element: HTMLVideoElement, force?: boolean): void {
    element.classList.toggle('group-video-grid__element-video--contain', force);
  }

  scaleVideos(rootElement: HTMLElement): void {
    const gridElements = Array.from(rootElement.querySelectorAll('.group-video-grid__element'));
    gridElements.forEach((element: HTMLElement) => {
      const videoElement = element.querySelector('video');
      const userId = element.dataset.userId;
      const participant = this.videoParticipants().find(participant => participant.user.id === userId);
      if (participant) {
        afterRender(() => this.toggleContain(videoElement, participant.sharesScreen()));
      }
    });
  }

  doubleClickedOnVideo = (_: GroupVideoGrid, {currentTarget}: MouseEvent): void => {
    const childVideo = (currentTarget as HTMLElement).querySelector('video');
    this.toggleContain(childVideo);
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
              css: {mirror: participant.user.isMe && participant.sharesCamera()},
              attr: {'data-user-id': participant.user.id},
              event: {dblclick: doubleClickedOnVideo}"
            data-uie-name="item-grid"
          >
            <video class="group-video-grid__element-video" autoplay playsinline data-bind="sourceStream: participant.videoStream(), css: {'group-video-grid__element-video--contain': participant.sharesScreen()}">
            </video>
            <!-- ko if: !minimized -->
              <!-- ko if: participant.user.isMe && muted() -->
                <div class="group-video-grid__mute-overlay" data-uie-name="status-call-audio-muted">
                  <micoff-icon></micoff-icon>
                </div>
              <!-- /ko -->
              <div class="group-video-grid__element__label">
                <!-- microphone icon goes here -->
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
          <video class="mirror group-video__thumbnail-video" autoplay playsinline data-uie-name="self-video-thumbnail" data-bind="css: {'group-video__thumbnail--minimized': minimized, 'mirror': grid().thumbnail.hasActiveVideo()}, sourceStream: grid().thumbnail.videoStream()">	
          </video>	
          <!-- ko if: muted() -->	
            <div class="group-video-grid__mute-overlay" data-uie-name="status-call-audio-muted">	
              <micoff-icon></micoff-icon>	
            </div>	
          <!-- /ko -->	
        </div>	
      <!-- /ko -->
    </div>
  `,
  viewModel: {
    createViewModel: (params: GroupVideoGripParams, componentInfo: {element: HTMLElement}) =>
      new GroupVideoGrid(params, componentInfo.element),
  },
});
