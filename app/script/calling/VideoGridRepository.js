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
window.z.calling = z.calling || {};

z.calling.VideoGridRepository = class VideoGridRepository {
  /**
   * Construct an new VideoGridRepository.
   * @param {CallingRepository} callingRepository - Repository for the calls
   * @param {MediaRepository} mediaRepository - Repository for the media streams
   */
  constructor(callingRepository, mediaRepository) {
    const streamHandler = mediaRepository.streamHandler;
    const streamsInfo = streamHandler.remoteMediaStreamInfoIndex.video;
    const localMediaStream = streamHandler.localMediaStream;
    const selfStreamState = callingRepository.selfStreamState;
    const calls = callingRepository.calls;
    this.grid = ko.observableArray([0, 0, 0, 0]);
    this.selfId = ko.observable();
    this.thumbnailStream = ko.observable();
    this.mirrorSelf = ko.pureComputed(() => !selfStreamState.screenSend());

    const selfStream = ko.pureComputed(() => {
      return selfStreamState.videoSend() || selfStreamState.screenSend() ? localMediaStream() : undefined;
    });
    this.selfStreamMuted = ko.pureComputed(() => !selfStreamState.audioSend());

    this.streams = ko.pureComputed(() => {
      const noVideoParticipantIds = calls()
        .reduce((participants, call) => participants.concat(call.participants()), [])
        .filter(participant => !(participant.activeState.videoSend() || participant.activeState.screenSend()))
        .map(participant => participant.id);

      const remoteStreams = streamsInfo()
        .filter(mediaStreamInfo => !noVideoParticipantIds.includes(mediaStreamInfo.flowId))
        .map(mediaStreamInfo => mediaStreamInfo.stream);

      this.selfId(selfStream() ? selfStream().id : undefined);

      if (remoteStreams.length === 1) {
        this.thumbnailStream(selfStream());
        return remoteStreams;
      }
      this.thumbnailStream(undefined);
      return selfStream() ? remoteStreams.concat(selfStream()) : remoteStreams;
    });

    this.streams.subscribe(this.updateGrid.bind(this));
    this.updateGrid(this.streams());
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
    const previousStreamIds = previousGrid.filter(streamId => streamId !== 0);
    const currentStreamIds = streams.map(participant => participant.id);

    const addedStreamIds = z.util.ArrayUtil.getDifference(previousStreamIds, currentStreamIds);

    const filteredGrid = previousGrid.map(id => (currentStreamIds.includes(id) ? id : 0));

    const streamIds = filteredGrid.filter(streamId => streamId !== 0);
    // Add the new streams at the end
    const newStreamsIds = streamIds.concat(addedStreamIds);
    return newStreamsIds.length === 2
      ? [newStreamsIds[0], 0, newStreamsIds[1], 0]
      : [newStreamsIds[0] || 0, newStreamsIds[3] || 0, newStreamsIds[1] || 0, newStreamsIds[2] || 0];
  }

  updateGrid(streams) {
    const newGrid = this.computeGrid(this.grid(), streams);
    this.grid(newGrid);
  }
};
