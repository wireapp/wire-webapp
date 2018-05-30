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

z.components.GroupVideoGrid = (() => {
  class GroupVideoGrid {
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

    constructor(params, rootElement) {
      this.grid = ko.observableArray([0, 0, 0, 0]);
      this.thumbnailStream = ko.observable(null);
      this.selfId = ko.observable(null);
      this.mirrorSelf = !params.screenSend;

      this.streams = ko.pureComputed(() => {
        const remoteStreams = this.filterUnsentStreams(params.streamsInfo(), params.calls());
        const selfStream = params.selfStream();
        this.selfId(selfStream ? selfStream.id : null);

        if (remoteStreams.length === 1) {
          this.thumbnailStream(selfStream);
          return remoteStreams;
        }
        this.thumbnailStream(null);
        return selfStream ? remoteStreams.concat(selfStream) : remoteStreams;
      });

      this.streams.subscribe(this.updateGrid.bind(this));
      this.updateGrid(this.streams());

      this.scaleVideos = this.scaleVideos.bind(this, rootElement);
      // scale videos when the grid is updated (on the next rendering cycle)
      this.grid.subscribe(() => z.util.afterRender(this.scaleVideos));

      // scale the videos when the window is resized
      window.addEventListener('resize', this.scaleVideos);

      this.minimized = params.minimized;
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
          video.removeEventListener(event.type, handleLoadEvent);
        };

        if (videoElement.videoWidth > 0) {
          setScale(videoElement, containerRatio);
        } else {
          videoElement.addEventListener('loadedmetadata', handleLoadEvent);
        }
      });
    }

    dispose() {
      window.removeEventListener('resize', this.scaleVideos);
    }

    /**
     * Will compute the next grid layout according to the previous state and the new array of streams
     * The grid will fill according to this pattern
     * - 1 stream : [id, 0, 0, 0]
     * - 2 streams: [id, 0, id, 0]
     * - 3 streams: [id, 0, id, id]
     * - 3 streams: [id, id, 0, id]
     * - 4 streams: [id, id, id, id]
     * @param {Array<string|0>} previousGrid - the previous state of the grid
     * @param {Array<MediaStream>} streams - the new array of streams to dispatch in the grid
     *
     * @returns {Array<string|0>} the new grid
     */
    computeGrid(previousGrid, streams) {
      const currentStreamIds = streams.map(participant => participant.id);
      const previousStreamIds = previousGrid.filter(streamId => streamId !== 0);

      const addedStreamIds = z.util.ArrayUtil.getDifference(previousStreamIds, currentStreamIds);
      const deletedStreamIds = z.util.ArrayUtil.getDifference(currentStreamIds, previousStreamIds);

      if (deletedStreamIds.length > 0) {
        // if there was some streams that left the call
        // do not reorder the matrix
        const newGrid = previousGrid.map(id => (deletedStreamIds.includes(id) ? 0 : id));

        const newStreamIds = newGrid.filter(streamId => streamId !== 0);
        const hasTwoStreamIds = newStreamIds.length === 2;
        return hasTwoStreamIds ? [newStreamIds[0], 0, newStreamIds[1], 0] : newGrid;
      }

      // Add the new streams at the end
      const newStreamsIds = previousStreamIds.concat(addedStreamIds);
      return [newStreamsIds[0] || 0, newStreamsIds[3] || 0, newStreamsIds[1] || 0, newStreamsIds[2] || 0];
    }

    updateGrid(streams) {
      const newGrid = this.computeGrid(this.grid(), streams);
      this.grid(newGrid);
    }

    getParticipantStream(id) {
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

    getClassNameForVideo(index) {
      const size = this.getSizeForVideo(index);
      const SIZES = GroupVideoGrid.CONFIG.VIDEO_ELEMENT_SIZE;
      const extraClasses = {
        [SIZES.EMPTY]: 'group-video-grid__element--empty',
        [SIZES.FULL_SCREEN]: 'group-video-grid__element--full-size',
        [SIZES.HALF_SCREEN]: 'group-video-grid__element--full-height',
        [SIZES.FOURTH_SCREEN]: '',
      };

      const isSelfVideo = this.grid()[index] === this.selfId();
      const mirrorClass = isSelfVideo && this.mirrorSelf ? ' mirror' : '';
      return `group-video-grid__element${index} ${extraClasses[size]} ${mirrorClass}`;
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

    filterUnsentStreams(streamsInfo, calls) {
      const hasActiveVideo = mediaStreamInfo => {
        const noVideoParticipantIds = calls
          .reduce((participants, call) => participants.concat(call.participants()), [])
          .filter(participant => !participant.state.videoSend())
          .map(participant => participant.id);

        // filter participant that have their video stream disabled
        return !noVideoParticipantIds.includes(mediaStreamInfo.flow_id);
      };

      return streamsInfo.filter(hasActiveVideo).map(mediaStreamInfo => mediaStreamInfo.stream);
    }
  }

  ko.components.register('group-video-grid', {
    template: `
      <div class="group-video" data-bind="template: {afterRender: scaleVideos}">
        <div class="group-video-grid" data-bind="foreach: {data: grid, as: 'streamId'}">
          <!-- ko if: streamId !== 0 -->
            <div class="group-video-grid__element" data-bind="css: $parent.getClassNameForVideo($index()), attr: {'data-uie-name': 'item-grid', 'data-uie-value': $parent.getUIEValueForVideo($index())}">
              <video autoplay class="group-video-grid__element-video" data-bind="sourceStream: $parent.getParticipantStream(streamId), muteMediaElement: $parent.getParticipantStream(streamId)">
              </video>
            </div>
          <!-- /ko -->
        </div>
        <!-- ko if: thumbnailStream() -->
          <video autoplay class="group-video__thumbnail" data-uie-name="self-video-thumbnail" data-bind="css: {'group-video__thumbnail--minimized': minimized, 'mirror': mirrorSelf}, sourceStream: thumbnailStream(), muteMediaElement: thumbnailStream()"></video>
        <!-- /ko -->
      </div>
    `,
    viewModel: {
      createViewModel: (params, componentInfo) => new GroupVideoGrid(params, componentInfo.element),
    },
  });

  return GroupVideoGrid;
})();
