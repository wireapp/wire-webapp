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
    const {hasActiveVideo, localMediaStream, selfStreamState} = streamHandler;

    const calls = callingRepository.calls;
    this.grid = ko.observableArray([0, 0, 0, 0]);
    this.thumbnailStream = ko.observable();

    const selfStream = ko.pureComputed(() => {
      const stream = hasActiveVideo() ? localMediaStream() : undefined;
      return {
        audioSend: selfStreamState.audioSend,
        id: stream && stream.id,
        isSelf: true,
        screenSend: selfStreamState.screenSend,
        stream: stream,
        videoSend: selfStreamState.videoSend,
      };
    });

    this.streams = ko.pureComputed(() => {
      const videoParticipants = calls()
        .reduce((participantEntities, callEntity) => participantEntities.concat(callEntity.participants()), [])
        .filter(participantEntity => participantEntity.hasActiveVideo());

      const videoParticipantIds = videoParticipants.map(participant => participant.id);

      const remoteStreams = streamsInfo()
        .filter(mediaStreamInfo => videoParticipantIds.includes(mediaStreamInfo.flowId))
        .map(mediaStreamInfo => {
          const stream = mediaStreamInfo.stream;
          const participant = videoParticipants.find(videoParticipant => {
            return videoParticipant.id === mediaStreamInfo.flowId;
          });

          return {
            id: stream.id,
            picture: participant.user.mediumPictureResource,
            screenSend: participant.state.screenSend,
            stream: stream,
            videoSend: participant.state.videoSend,
          };
        });

      if (remoteStreams.length === 1) {
        this.thumbnailStream(selfStream());
        return remoteStreams;
      }
      this.thumbnailStream(undefined);
      return selfStream().stream ? remoteStreams.concat(selfStream()) : remoteStreams;
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
    const currentStreamIds = streams.map(stream => stream.id);

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
