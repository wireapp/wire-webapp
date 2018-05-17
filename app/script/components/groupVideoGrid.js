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
  constructor(params) {
    this.grid = ko.observableArray([0, 0, 0, 0]);
    this.thumbnailStream = ko.observable(null);

    this.streams = ko.pureComputed(() => {
      const remoteStreams = params.streams();
      const ownStream = params.ownStream();

      if (remoteStreams.length === 1) {
        this.thumbnailStream(ownStream);
        return remoteStreams;
      }
      this.thumbnailStream(null);
      return remoteStreams.concat(ownStream);
    });

    this.streams.subscribe(this.updateGrid.bind(this));

    this.minimized = params.minimized;
  }

  scaleVideos(elements) {
    elements
      .filter(element => !!element.classList)
      .filter(element => element.classList.contains('group-video-grid__element'))
      .forEach(element => {
        const containerRect = element.getBoundingClientRect();
        const containerRatio = containerRect.width / containerRect.height;
        element.querySelector('video').addEventListener('loadedmetadata', setScale);

        function setScale(event) {
          const video = event.target;
          const videoRatio = video.videoWidth / video.videoHeight;
          if (videoRatio < containerRatio) {
            video.classList.add('group-video-grid__element-video--fill-width');
          } else {
            video.classList.add('group-video-grid__element-video--fill-height');
          }
          video.removeEventListener(event.type, setScale);
        }
      });
  }

  /**
   * Will compute the next grid layout according to the previous state and the new array of streams
   * The grid will fill according to this pattern
   * - 1 stream : [id, 0, 0, 0]
   * - 2 streams: [id, 0, id, 0]
   * - 3 streams: [id, 0, id, id]
   * - 3 streams: [id, id, 0, id]
   * - 4 streams: [id, id, id, id]
   * @param {Array<StreamId|0>} previousGrid - the previous state of the grid
   * @param {Array<Stream>} streams - the new array of streams to dispatch in the grid
   *
   * @returns {Array<StreamId|0>} the new grid
   */
  computeGrid(previousGrid, streams) {
    const streamIds = streams.map(participant => participant.id);
    const currentStreams = previousGrid.filter(streamId => streamId !== 0);

    const addedStreams = arrayDiff(currentStreams, streamIds);
    const deletedStreams = arrayDiff(streamIds, currentStreams);

    if (deletedStreams.length > 0) {
      // if there was some streams that left the call
      // do not reorder the matrix
      const newGrid = previousGrid.map(id => {
        return deletedStreams.includes(id) ? 0 : id;
      });

      const newStreams = newGrid.filter(streamId => streamId !== 0);

      if (newStreams.length === 2) {
        return [newStreams[0], 0, newStreams[1], 0];
      }
      return newGrid;
    }

    const newStreamsList = currentStreams
      // add the new streams at the and
      .concat(addedStreams);

    return [newStreamsList[0] || 0, newStreamsList[3] || 0, newStreamsList[1] || 0, newStreamsList[2] || 0];
  }

  updateGrid(streams) {
    const newGrid = this.computeGrid(this.grid(), streams);
    this.grid(newGrid);
  }

  getParticipantStream(id) {
    return this.streams().find(stream => stream.id === id);
  }

  getClassNameForVideo(index) {
    const baseClass = `group-video-grid__element${index}`;
    const grid = this.grid();
    let extraClass = '';
    if (grid[index] === 0) {
      return `${baseClass} group-video-grid__element--empty`;
    }
    const isAlone = grid.every((value, i) => i === index || value === 0);
    const hasVerticalNeighbor = index % 2 === 0 ? grid[index + 1] !== 0 : grid[index - 1] !== 0;

    if (isAlone) {
      extraClass += ' group-video-grid__element--full-size';
    } else if (!hasVerticalNeighbor) {
      extraClass += ' group-video-grid__element--full-height';
    }
    return `${baseClass} ${extraClass}`;
  }
};

function arrayDiff(array1, array2) {
  return array2.filter(element => !array1.includes(element));
}

ko.components.register('group-video-grid', {
  template: `
    <div class="group-video">
      <div class="group-video-grid" data-bind="foreach: { data: grid, as: 'streamId', afterRender: scaleVideos}">
        <!-- ko if: streamId !== 0 -->
          <div class="group-video-grid__element" data-bind="css: $parent.getClassNameForVideo($index()), attr: { 'data-uie-name': 'grid-video-' + $index() }">
            <video autoplay class="group-video-grid__element-video" data-bind="sourceStream: $parent.getParticipantStream(streamId), muteMediaElement: $parent.getParticipantStream(streamId)">
            </video>
          </div>
        <!-- /ko -->
      </div>
      <!-- ko if: thumbnailStream() -->
        <video autoplay class="group-video__thumbnail" data-bind="css: {'group-video__thumbnail--minimized': minimized}, sourceStream: thumbnailStream(), muteMediaElement: thumbnailStream()">
        </video>
      <!-- /ko -->
    </div>
  `,
  viewModel: z.components.GroupVideoGrid,
});
