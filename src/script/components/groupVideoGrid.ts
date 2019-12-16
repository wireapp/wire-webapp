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

import {Participant} from '../calling/Participant';
import {Grid} from '../calling/videoGridHandler';

enum VIDEO_SIZE {
  EMPTY = 'empty',
  FULL_SCREEN = 'full_screen',
  HALF_SCREEN = 'half_screen',
  QUARTER_SCREEN = 'quarter_screen',
}

class GroupVideoGrid {
  private readonly grid: ko.PureComputed<Grid>;
  private readonly videoParticipants: ko.PureComputed<Participant[]>;
  private readonly minimized: boolean;
  public readonly muted: ko.Observable<boolean>;
  public readonly selfUserId: string;

  public readonly dispose: () => void;

  // tslint:disable-next-line:typedef
  static get CONFIG() {
    return {
      CONTAIN_CLASS: 'group-video-grid__element-video--contain',
      RATIO_THRESHOLD: 0.4,
    };
  }

  constructor(
    {
      minimized,
      grid,
      muted,
      selfUserId,
    }: {minimized: boolean; grid: ko.PureComputed<Grid>; muted: ko.Observable<boolean> | undefined; selfUserId: string},
    rootElement: HTMLElement,
  ) {
    this.selfUserId = selfUserId;
    this.scaleVideos = this.scaleVideos.bind(this, rootElement);
    this.grid = grid;
    this.muted = muted || ko.observable(false);
    this.videoParticipants = ko.pureComputed(() => this.grid().grid.filter(participant => !!participant));

    this.minimized = minimized;
    // scale videos when the grid is updated (on the next rendering cycle)
    const gridSubscription = this.grid.subscribe(() => afterRender(this.scaleVideos));
    this.dispose = () => gridSubscription.dispose();
  }

  hasBlackBackground(): boolean {
    const gridElementsCount = this.grid().grid.filter(participant => !!participant).length;
    return this.minimized && gridElementsCount > 1;
  }

  scaleVideos(rootElement: HTMLElement): void {
    const elements = Array.from(rootElement.querySelectorAll('.group-video-grid__element'));
    const setScale = (videoElement: HTMLVideoElement, wrapper: HTMLElement) => {
      const userId = wrapper.dataset.userId;
      const participant = this.videoParticipants().find(participant => participant.userId === userId);
      if (participant) {
        updateContainClass(videoElement, wrapper, participant);
      }
    };

    const updateContainClass = (
      videoElement: HTMLVideoElement,
      wrapper: HTMLElement,
      participant: Participant,
    ): void => {
      const wrapperRatio = wrapper.clientWidth / wrapper.clientHeight;
      const videoRatio = videoElement.videoWidth / videoElement.videoHeight;
      const isVeryDifferent = Math.abs(wrapperRatio - videoRatio) > GroupVideoGrid.CONFIG.RATIO_THRESHOLD;
      const shouldBeContain = isVeryDifferent || participant.sharesScreen();
      videoElement.classList.toggle(GroupVideoGrid.CONFIG.CONTAIN_CLASS, shouldBeContain);
    };

    elements.forEach((element: HTMLElement) => {
      const videoElement = element.querySelector('video');
      if (videoElement.videoWidth > 0) {
        afterRender(() => setScale(videoElement, element));
      } else {
        videoElement.addEventListener('loadedmetadata', () => setScale(videoElement, element), {once: true});
      }
    });
  }

  doubleClickedOnVideo = (viewModel: any, {currentTarget}: any): void => {
    const childVideo = currentTarget.querySelector('video');
    childVideo.classList.toggle(GroupVideoGrid.CONFIG.CONTAIN_CLASS);
  };

  getSizeForVideo(index: number): VIDEO_SIZE {
    const grid = this.grid().grid;

    const isAlone = grid.filter(member => !!member).length === 1;
    const hasVerticalNeighbor = index % 2 === 0 ? grid[index + 1] !== null : grid[index - 1] !== null;

    if (isAlone) {
      return VIDEO_SIZE.FULL_SCREEN;
    } else if (!hasVerticalNeighbor) {
      return VIDEO_SIZE.HALF_SCREEN;
    }
    return VIDEO_SIZE.QUARTER_SCREEN;
  }

  getClassNameForVideo(index: number, participant: Participant): string {
    const size = this.getSizeForVideo(index);
    const extraClasses: Record<VIDEO_SIZE, string> = {
      [VIDEO_SIZE.EMPTY]: 'group-video-grid__element--empty',
      [VIDEO_SIZE.FULL_SCREEN]: 'group-video-grid__element--full-size',
      [VIDEO_SIZE.HALF_SCREEN]: 'group-video-grid__element--full-height',
      [VIDEO_SIZE.QUARTER_SCREEN]: '',
    };

    const roundedClass =
      this.minimized && this.videoParticipants().length === 1 ? ' group-video-grid__element--rounded' : '';
    const shouldBeMirrored = participant.userId === this.selfUserId && participant.sharesCamera();
    const mirrorClass = shouldBeMirrored ? ' mirror' : '';
    return `group-video-grid__element${index} ${extraClasses[size]}${mirrorClass}${roundedClass}`;
  }

  getUIEValueForVideo(index: number): string {
    const size = this.getSizeForVideo(index);
    const extraClasses = {
      [VIDEO_SIZE.EMPTY]: '',
      [VIDEO_SIZE.FULL_SCREEN]: 'full',
      [VIDEO_SIZE.HALF_SCREEN]: 'half',
      [VIDEO_SIZE.QUARTER_SCREEN]: 'quarter',
    };
    return extraClasses[size];
  }
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
              css: getClassNameForVideo($index(), participant),
              attr: {'data-uie-value': getUIEValueForVideo($index()), 'data-user-id': participant.userId},
              event: {dblclick: doubleClickedOnVideo}"
            data-uie-name="item-grid"
          >
            <video class="group-video-grid__element-video" autoplay playsinline data-bind="sourceStream: participant.videoStream(), css: {'group-video-grid__element-video--contain': participant.sharesScreen()}">
            </video>
            <!-- ko if: !minimized && muted() && participant.userId === selfUserId -->
              <div class="group-video-grid__mute-overlay" data-uie-name="status-call-audio-muted">
                <micoff-icon></micoff-icon>
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
    createViewModel: (params: any, componentInfo: any) => new GroupVideoGrid(params, componentInfo.element),
  },
});
