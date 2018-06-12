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

'use strict';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.GroupVideoGrid = class GroupVideoGrid {
  static get CONFIG() {
    return {
      VIDEO_ELEMENT_SIZE: {
        FOURTH_SCREEN: 'fourth_screen',
        FULL_SCREEN: 'full_screen',
        HALF_SCREEN: 'half_screen',
        HIDDEN: 'hidden',
      },
    };
  }

  constructor({minimized, videoGridRepository}, rootElement) {
    this.grid = videoGridRepository.grid;
    this.thumbnailStream = videoGridRepository.thumbnailStream;
    this.streams = videoGridRepository.streams;

    this.minimized = minimized;

    this.hasBlackBackground = ko.pureComputed(() => {
      const gridElementsCount = this.grid().filter(id => id !== 0).length;
      return this.minimized && gridElementsCount > 1;
    });

    this.scaleVideos = this.scaleVideos.bind(this, rootElement);

    // scale videos when the grid is updated (on the next rendering cycle)
    this.grid.subscribe(() => z.util.afterRender(this.scaleVideos));

    // scale the videos when the window is resized
    window.addEventListener('resize', this.scaleVideos);
  }

  scaleVideos(rootElement) {
    const elements = Array.from(rootElement.querySelectorAll('.group-video-grid__element'));
    const setScale = (video, containerRatio) => {
      const fullHeightClass = 'group-video-grid__element-video--fill-height';
      const fullWidthClass = 'group-video-grid__element-video--fill-width';
      const videoRatio = video.videoWidth / video.videoHeight;
      video.classList.remove(fullHeightClass);
      video.classList.remove(fullWidthClass);

      const isPortrait = videoRatio > containerRatio || video.videoWidth < video.videoHeight;
      const fillClasses = isPortrait ? fullHeightClass : fullWidthClass;
      video.classList.add(fillClasses);
    };

    elements.forEach(element => {
      const containerRect = element.getBoundingClientRect();
      const containerRatio = containerRect.width / containerRect.height;
      const videoElement = element.querySelector('video');
      const handleLoadEvent = event => {
        const video = event.target;
        setScale(video, containerRatio);
      };

      if (videoElement.videoWidth > 0) {
        setScale(videoElement, containerRatio);
      } else {
        videoElement.addEventListener('loadedmetadata', handleLoadEvent, {once: true});
      }
    });
  }

  dispose() {
    window.removeEventListener('resize', this.scaleVideos);
  }

  getStreamInfo(id) {
    return this.streams().find(stream => stream.id === id);
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
    return SIZES.FOURTH_SCREEN;
  }

  getClassNameForVideo(index, isMirrored) {
    const size = this.getSizeForVideo(index);
    const SIZES = GroupVideoGrid.CONFIG.VIDEO_ELEMENT_SIZE;
    const extraClasses = {
      [SIZES.EMPTY]: 'group-video-grid__element--empty',
      [SIZES.FULL_SCREEN]: 'group-video-grid__element--full-size',
      [SIZES.HALF_SCREEN]: 'group-video-grid__element--full-height',
      [SIZES.FOURTH_SCREEN]: '',
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
      [SIZES.FOURTH_SCREEN]: 'fourth',
    };
    return extraClasses[size];
  }
};

ko.components.register('group-video-grid', {
  template: `
      <div class="group-video" data-bind="template: {afterRender: scaleVideos}">
        <div class="group-video-grid" data-bind="foreach: {data: grid, as: 'id'}, css: {'group-video-grid--black-background': hasBlackBackground()}">
          <!-- ko if: id !== 0 -->
            <div class="group-video-grid__element" data-bind="css: $parent.getClassNameForVideo($index(), $parent.getStreamInfo(id).isSelf && $parent.getStreamInfo(id).videoSend()), attr: {'data-uie-name': 'item-grid', 'data-uie-value': $parent.getUIEValueForVideo($index())}">
              <video autoplay class="group-video-grid__element-video" data-bind="sourceStream: $parent.getStreamInfo(id).stream, muteMediaElement: $parent.getStreamInfo(id).stream">
              </video>
              <!-- ko if: $parent.getStreamInfo(id).isSelf && !$parent.getStreamInfo(id).audioSend() && !$parent.minimized -->
                <div class="group-video-grid__mute-overlay">
                  <micoff-icon></micoff-icon>
                </div>
              <!-- /ko -->
              <!-- ko if: $parent.getStreamInfo(id).videoSend() === z.calling.enum.PROPERTY_STATE.PAUSED -->
                <div class="group-video-grid__pause-overlay" data-bind="switchBackground: $parent.getStreamInfo(id).picture()">
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
            <video autoplay class="mirror group-video__thumbnail-video" data-uie-name="self-video-thumbnail" data-bind="css: {'group-video__thumbnail--minimized': minimized, 'mirror': thumbnailStream().videoSend()}, sourceStream: thumbnailStream().stream, muteMediaElement: thumbnailStream().stream">
            </video>
            <!-- ko if: !thumbnailStream().audioSend() && !minimized -->
              <div class="group-video-grid__mute-overlay">
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
