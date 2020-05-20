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

import type {Participant, UserId} from '../calling/Participant';

let baseGrid: string[] = [];

export interface Grid {
  grid: (Participant | null)[];
  thumbnail: Participant | null;
  hasRemoteVideo: boolean;
}

export function getGrid(
  participants: ko.Observable<Participant[]>,
  selfParticipant: Participant,
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
        ? [selfParticipant, ...remoteVideoParticipants]
        : remoteVideoParticipants;
      thumbnailParticipant = null;
    }
    baseGrid = inGridParticipants.map(({userId}) => userId);

    return {
      grid: baseGrid.map((userId: UserId) => {
        return inGridParticipants.find(participant => participant.userId === userId) || null;
      }),
      hasRemoteVideo: remoteVideoParticipants.length > 0,
      thumbnail: thumbnailParticipant,
    };
  });
}
