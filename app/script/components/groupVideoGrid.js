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

window.z = window.z || {};
window.z.components = z.components || {};

z.components.GroupVideoGrid = class GroupVideoGrid {
  static get CONFIG() {
    return {
      CONTAIN_CLASS: 'group-video-grid__element-video--contain',
      RATIO_THRESHOLD: 0.4,
      VIDEO_ELEMENT_SIZE: {
        FULL_SCREEN: 'full_screen',
        HALF_SCREEN: 'half_screen',
        HIDDEN: 'hidden',
        QUARTER_SCREEN: 'quarter_screen',
      },
    };
  }

  constructor({minimized, videoGridRepository}, rootElement) {
    this.scaleVideos = this.scaleVideos.bind(this, rootElement);
    this.doubleClickedOnVideo = this.doubleClickedOnVideo.bind(this);

    this.grid = videoGridRepository.grid;
    this.thumbnailStream = videoGridRepository.thumbnailStream;
    this.streams = videoGridRepository.streams;

    this.getStreamInfo = id => this.streams().find(stream => stream.id === id);
    this.gridInfo = ko.pureComputed(() => this.grid().map(this.getStreamInfo));

    this.minimized = minimized;

    this.hasBlackBackground = ko.pureComputed(() => {
      const gridElementsCount = this.grid().filter(id => id !== 0).length;
      return this.minimized && gridElementsCount > 1;
    });

    // scale videos when the grid is updated (on the next rendering cycle)
    this.grid.subscribe(() => z.util.afterRender(this.scaleVideos));
  }

  scaleVideos(rootElement) {
    const elements = Array.from(rootElement.querySelectorAll('.group-video-grid__element'));
    const setScale = (videoElement, wrapper) => {
      const streamId = wrapper.dataset.streamId;
      const streamInfo = this.getStreamInfo(streamId);
      if (streamInfo) {
        const isScreenSend = streamInfo.screenSend();
        updateContainClass(videoElement, wrapper, isScreenSend, streamInfo);
        streamInfo.screenSend.subscribe(screenSend => {
          delete streamInfo.fitContain;
          updateContainClass(videoElement, wrapper, screenSend, streamInfo);
        });
      }
    };

    const updateContainClass = (videoElement, wrapper, isScreenSend, streamInfo) => {
      const hasFitSet = streamInfo.hasOwnProperty('fitContain');
      const wrapperRatio = wrapper.clientWidth / wrapper.clientHeight;
      const videoRatio = videoElement.videoWidth / videoElement.videoHeight;
      const isVeryDifferent = Math.abs(wrapperRatio - videoRatio) > GroupVideoGrid.CONFIG.RATIO_THRESHOLD;
      const shouldBeContain = isVeryDifferent || isScreenSend === z.calling.enum.PROPERTY_STATE.TRUE;
      const forceClass = hasFitSet ? streamInfo.fitContain : shouldBeContain;
      videoElement.classList.toggle(GroupVideoGrid.CONFIG.CONTAIN_CLASS, forceClass);
    };

    elements.forEach(element => {
      const videoElement = element.querySelector('video');
      if (videoElement.videoWidth > 0) {
        z.util.afterRender(() => setScale(videoElement, element));
      } else {
        videoElement.addEventListener('loadedmetadata', () => setScale(videoElement, element), {once: true});
      }
    });
  }

  doubleClickedOnVideo(viewModel, {currentTarget}) {
    const childVideo = currentTarget.querySelector('video');
    const streamId = currentTarget.dataset.streamId;
    const streamInfo = this.getStreamInfo(streamId);

    const hasFitProperty = streamInfo.hasOwnProperty('fitContain');
    const hasFitClass = childVideo.classList.contains(GroupVideoGrid.CONFIG.CONTAIN_CLASS);
    streamInfo.fitContain = hasFitProperty ? !streamInfo.fitContain : !hasFitClass;

    childVideo.classList.toggle(GroupVideoGrid.CONFIG.CONTAIN_CLASS, streamInfo.fitContain);
  }

  getSizeForVideo(index) {
    const grid = this.grid();
    const SIZES = GroupVideoGrid.CONFIG.VIDEO_ELEMENT_SIZE;
    if (grid[index] === 0) {
      return SIZES.EMPTY;
    }

    const isAlone = grid.every((value, i) => i === index || value === 0);
    const hasVerticalNeighbor = index % 2 === 0 ? grid[index + 1] !== 0 : grid[index - 1] !== 0;

    if (isAlone) {
      return SIZES.FULL_SCREEN;
    } else if (!hasVerticalNeighbor) {
      return SIZES.HALF_SCREEN;
    }
    return SIZES.QUARTER_SCREEN;
  }

  getClassNameForVideo(index, isMirrored) {
    const size = this.getSizeForVideo(index);
    const SIZES = GroupVideoGrid.CONFIG.VIDEO_ELEMENT_SIZE;
    const extraClasses = {
      [SIZES.EMPTY]: 'group-video-grid__element--empty',
      [SIZES.FULL_SCREEN]: 'group-video-grid__element--full-size',
      [SIZES.HALF_SCREEN]: 'group-video-grid__element--full-height',
      [SIZES.QUARTER_SCREEN]: '',
    };

    const roundedClass = this.streams().length === 1 && this.minimized ? ' group-video-grid__element--rounded' : '';
    const mirrorClass = isMirrored ? ' mirror' : '';
    return `group-video-grid__element${index} ${extraClasses[size]}${mirrorClass}${roundedClass}`;
  }

  getUIEValueForVideo(index) {
    const size = this.getSizeForVideo(index);
    const SIZES = GroupVideoGrid.CONFIG.VIDEO_ELEMENT_SIZE;
    const extraClasses = {
      [SIZES.EMPTY]: '',
      [SIZES.FULL_SCREEN]: 'full',
      [SIZES.HALF_SCREEN]: 'half',
      [SIZES.QUARTER_SCREEN]: 'quarter',
    };
    return extraClasses[size];
  }
};

ko.components.register('group-video-grid', {
  template: `
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
              <!-- ko if: streamInfo.videoSend() === z.calling.enum.PROPERTY_STATE.PAUSED -->
                <div class="group-video-grid__pause-overlay" data-bind="switchBackground: streamInfo.picture()">
                  <div class="background">
                    <div class="background-image"></div>
                    <div class="background-darken"></div>
                  </div>
                  <div class="group-video-grid__pause-overlay__label" data-bind="l10n_text: z.string.videoCallPaused, css: {'group-video-grid__pause-overlay__label--minimized': $parent.minimized}" data-uie-name="status-video-paused"></div>
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
    createViewModel: (params, componentInfo) => new z.components.GroupVideoGrid(params, componentInfo.element),
  },
});
