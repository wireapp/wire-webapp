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

import {PROPERTY_STATE} from '../calling/enum/PropertyState';
import {Participant} from '../calling/Participant';
import {getGrid} from '../calling/videoGridHandler';

class GroupVideoGrid {
  private readonly grid: ko.PureComputed<(Participant | null)[]>;
  private readonly videoParticipants: ko.PureComputed<Participant[]>;
  private readonly minimized: boolean;

  static get CONFIG() {
    return {
      CONTAIN_CLASS: 'group-video-grid__element-video--contain',
      RATIO_THRESHOLD: 0.4,
      VIDEO_ELEMENT_SIZE: {
        EMPTY: 'empty',
        FULL_SCREEN: 'full_screen',
        HALF_SCREEN: 'half_screen',
        HIDDEN: 'hidden',
        QUARTER_SCREEN: 'quarter_screen',
      },
    };
  }

  constructor(
    {minimized, participants}: {minimized: boolean; participants: ko.Observable<Participant[]>},
    rootElement: HTMLElement
  ) {
    this.scaleVideos = this.scaleVideos.bind(this, rootElement);
    this.grid = getGrid(participants);
    this.videoParticipants = ko.pureComputed(() => this.grid().filter(participant => !!participant));

    this.minimized = minimized;
    /*
    this.grid = videoGridRepository.grid;
    this.thumbnailStream = videoGridRepository.thumbnailStream;
    this.streams = videoGridRepository.streams;

    this.getStreamInfo = id => this.streams().find(stream => stream.id === id);
    this.gridInfo = ko.pureComputed(() => this.grid().map(this.getStreamInfo));


    // scale videos when the grid is updated (on the next rendering cycle)
    this.grid.subscribe(() => afterRender(this.scaleVideos));

    this.PROPERTY_STATE = PROPERTY_STATE;
    */
  }

  hasBlackBackground() {
    const gridElementsCount = this.grid().filter(participant => !!participant).length;
    return this.minimized && gridElementsCount > 1;
  }

  scaleVideos(rootElement: HTMLElement) {
    const elements = Array.from(rootElement.querySelectorAll('.group-video-grid__element'));
    const setScale = (videoElement: HTMLVideoElement, wrapper: HTMLElement) => {
      const userId = wrapper.dataset.userId;
      const participant = this.videoParticipants().find(participant => participant.userId === userId);
      if (participant) {
        const isScreenSend = false; //TODO participant.screenSend();
        updateContainClass(videoElement, wrapper, isScreenSend, participant);
      }
    };

    const updateContainClass = (
      videoElement: HTMLVideoElement,
      wrapper: HTMLElement,
      isScreenSend: boolean,
      participant: Participant
    ) => {
      const hasFitSet = false; // TODO streamInfo.hasOwnProperty('fitContain');
      const wrapperRatio = wrapper.clientWidth / wrapper.clientHeight;
      const videoRatio = videoElement.videoWidth / videoElement.videoHeight;
      const isVeryDifferent = Math.abs(wrapperRatio - videoRatio) > GroupVideoGrid.CONFIG.RATIO_THRESHOLD;
      const shouldBeContain = isVeryDifferent || false; // TODO isScreenSend === PROPERTY_STATE.TRUE;
      const forceClass = hasFitSet ? false /*TODOstreamInfo.fitContain*/ : shouldBeContain;
      videoElement.classList.toggle(GroupVideoGrid.CONFIG.CONTAIN_CLASS, forceClass);
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

  doubleClickedOnVideo = (viewModel, {currentTarget}) => {
    return; // TODO
    const childVideo = currentTarget.querySelector('video');
    const userId = currentTarget.dataset.userId;
    const participant = this.videoParticipants().find(participant => participant.userId === userId);

    const hasFitProperty = participant.hasOwnProperty('fitContain');
    const hasFitClass = childVideo.classList.contains(GroupVideoGrid.CONFIG.CONTAIN_CLASS);
    participant.fitContain = hasFitProperty ? !participant.fitContain : !hasFitClass;

    childVideo.classList.toggle(GroupVideoGrid.CONFIG.CONTAIN_CLASS, participant.fitContain);
  };

  getSizeForVideo(index: number, participant: Participant) {
    const SIZES = GroupVideoGrid.CONFIG.VIDEO_ELEMENT_SIZE;
    const grid = this.grid();

    const isAlone = grid.filter(member => !!member).length === 1;
    const hasVerticalNeighbor = index % 2 === 0 ? grid[index + 1] !== null : grid[index - 1] !== null;

    if (isAlone) {
      return SIZES.FULL_SCREEN;
    } else if (!hasVerticalNeighbor) {
      return SIZES.HALF_SCREEN;
    }
    return SIZES.QUARTER_SCREEN;
  }

  getClassNameForVideo(index: number, participant: Participant) {
    const size = this.getSizeForVideo(index, participant);
    const SIZES = GroupVideoGrid.CONFIG.VIDEO_ELEMENT_SIZE;
    const extraClasses = {
      [SIZES.EMPTY]: 'group-video-grid__element--empty',
      [SIZES.FULL_SCREEN]: 'group-video-grid__element--full-size',
      [SIZES.HALF_SCREEN]: 'group-video-grid__element--full-height',
      [SIZES.QUARTER_SCREEN]: '',
    };

    const roundedClass =
      this.minimized && this.videoParticipants().length === 1 ? ' group-video-grid__element--rounded' : '';
    const mirrorClass = ''; //TODO isMirrored ? ' mirror' : '';
    return `group-video-grid__element${index} ${extraClasses[size]}${mirrorClass}${roundedClass}`;
  }

  getUIEValueForVideo(index: number, participant: Participant) {
    const size = this.getSizeForVideo(index, participant);
    const SIZES = GroupVideoGrid.CONFIG.VIDEO_ELEMENT_SIZE;
    const extraClasses = {
      [SIZES.EMPTY]: '',
      [SIZES.FULL_SCREEN]: 'full',
      [SIZES.HALF_SCREEN]: 'half',
      [SIZES.QUARTER_SCREEN]: 'quarter',
    };
    return extraClasses[size];
  }
}

ko.components.register('group-video-grid', {
  template: `
    <div class="group-video">
      <div class="group-video-grid" data-bind="
        foreach: {data: grid, as: 'participant', noChildContext: true, afterRender: scaleVideos},
        css: {'group-video-grid--black-background': hasBlackBackground()}"
      >
        <!-- ko if: participant -->
          <div class="group-video-grid__element" data-bind="
            css: getClassNameForVideo($index(), participant),
            attr: {'data-uie-name': 'item-grid', 'data-uie-value': getUIEValueForVideo($index()), 'data-user-id': participant.userId},
            event: {dblclick: doubleClickedOnVideo}"
          >
            <video class="group-video-grid__element-video" autoplay playsinline data-bind="sourceStream: participant.videoStream">
            </video>
          </div>
        <!-- /ko -->
      </div>
    </div>
  `,
  templateold: `
    <div class="group-video">

        <div class="group-video-grid" data-bind="foreach: {data: gridInfo, as: 'streamInfo', afterRender: scaleVideos}, css: {'group-video-grid--black-background': hasBlackBackground()}">
          <!-- ko if: streamInfo -->
            <div class="group-video-grid__element" data-bind="css: $parent.getClassNameForVideo($index(), streamInfo.isSelf && streamInfo.videoSend()), attr: {'data-uie-name': 'item-grid', 'data-uie-value': $parent.getUIEValueForVideo($index()), 'data-stream-id': streamInfo.id}, event: {dblclick: $parent.doubleClickedOnVideo}">
              <video class="group-video-grid__element-video" autoplay playsinline data-bind="sourceStream: streamInfo.stream, muteMediaElement: streamInfo.stream">
              </video>
              <!-- ko if: streamInfo.isSelf && !streamInfo.audioSend() && !$parent.minimized -->
                <div class="group-video-grid__mute-overlay" data-uie-name="status-call-audio-muted">
                  <micoff-icon></micoff-icon>
                </div>
              <!-- /ko -->
              <!-- ko if: streamInfo.videoSend() === $parent.PROPERTY_STATE.PAUSED -->
                <div class="group-video-grid__pause-overlay" data-bind="switchBackground: streamInfo.picture()">
                  <div class="background">
                    <div class="background-image"></div>
                    <div class="background-darken"></div>
                  </div>
                  <div class="group-video-grid__pause-overlay__label" data-bind="text: t('videoCallPaused'), css: {'group-video-grid__pause-overlay__label--minimized': $parent.minimized}" data-uie-name="status-video-paused"></div>
                </div>
              <!-- /ko -->
            </div>
          <!-- /ko -->
        </div>
        <!-- ko if: thumbnailStream() && thumbnailStream().stream -->
          <div class="group-video__thumbnail" data-bind="css: {'group-video__thumbnail--minimized': minimized}">
            <video class="mirror group-video__thumbnail-video" autoplay playsinline data-uie-name="self-video-thumbnail" data-bind="css: {'group-video__thumbnail--minimized': minimized, 'mirror': thumbnailStream().videoSend()}, sourceStream: thumbnailStream().stream, muteMediaElement: thumbnailStream().stream">
            </video>
            <!-- ko if: !thumbnailStream().audioSend() && !minimized -->
              <div class="group-video-grid__mute-overlay" data-uie-name="status-call-audio-muted">
                <micoff-icon></micoff-icon>
              </div>
            <!-- /ko -->
          </div>
        <!-- /ko -->
      </div>
    `,
  viewModel: {
    createViewModel: (params, componentInfo) => new GroupVideoGrid(params, componentInfo.element),
  },
});
