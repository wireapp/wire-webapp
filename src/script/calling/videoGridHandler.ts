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
import {getDifference} from 'Util/ArrayUtil';
import {Participant, UserId} from '../calling/Participant';

let baseGrid: string[] = ['', '', '', ''];

export interface Grid {
  grid: (Participant | null)[];
  thumbnail: Participant | null;
  hasRemoteVideo: boolean;
}

/**
 * Will compute the next grid layout according to the previous state and the new array of streams
 * The grid will fill according to this pattern
 * - 1 stream : [id, '', '', '']
 * - 2 streams: [id, '', id, '']
 * - 3 streams: [id, '', id, id]
 * - 3 streams: [id, id, '', id]
 * - 4 streams: [id, id, id, id]
 * @param {Array<string|0>} previousGrid - the previous state of the grid
 * @param {Array<MediaStream>} streams - the new array of streams to dispatch in the grid
 *
 * @returns {Array<string|0>} the new grid
 */
function computeGrid(previousGrid: string[], participants: Participant[]): string[] {
  const previousStreamIds = previousGrid.filter(streamId => streamId !== '');
  const currentStreamIds = participants.map(participant => participant.userId);

  const addedStreamIds = getDifference(previousStreamIds, currentStreamIds);

  const filteredGrid = previousGrid.map(id => (currentStreamIds.includes(id) ? id : ''));

  const streamIds = filteredGrid.filter(streamId => streamId !== '');
  // Add the new streams at the end
  const newStreamsIds = streamIds.concat(addedStreamIds);
  return newStreamsIds.length === 2
    ? [newStreamsIds[0], '', newStreamsIds[1], '']
    : [newStreamsIds[0] || '', newStreamsIds[3] || '', newStreamsIds[1] || '', newStreamsIds[2] || ''];
}

export function getGrid(
  participants: ko.Observable<Participant[]>,
  selfParticipant: Participant
): ko.PureComputed<Grid> {
  return ko.pureComputed(() => {
    let inGridParticipants: Participant[];
    let thumbnailParticipant: Participant | null;
    const remoteVideoParticipants = participants().filter(participant => participant.hasActiveVideo());
    if (remoteVideoParticipants.length === 1) {
      inGridParticipants = remoteVideoParticipants;
      thumbnailParticipant = selfParticipant.hasActiveVideo() ? selfParticipant : null;
    } else {
      inGridParticipants = selfParticipant.hasActiveVideo()
        ? remoteVideoParticipants.concat(selfParticipant)
        : remoteVideoParticipants;
      thumbnailParticipant = null;
    }
    baseGrid = computeGrid(baseGrid, inGridParticipants);

    return {
      grid: baseGrid.map((userId: UserId) => {
        return inGridParticipants.find(participant => participant.userId === userId) || null;
      }),
      hasRemoteVideo: remoteVideoParticipants.length > 0,
      thumbnail: thumbnailParticipant,
    };
  });
}
