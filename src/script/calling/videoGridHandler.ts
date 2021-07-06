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

import {sortUsersByPriority} from 'Util/StringUtil';

import type {Participant} from '../calling/Participant';
import {Call} from './Call';

export interface Grid {
  grid: Participant[];
  thumbnail: Participant | null;
}

export function getGrid(call: Call) {
  if (call.pages().length > 1) {
    return {
      grid: call.pages()[call.currentPage()],
      thumbnail: null,
    };
  }

  let inGridParticipants: Participant[];
  let thumbnailParticipant: Participant | null;
  const selfParticipant = call.getSelfParticipant();
  const remoteParticipants = call
    .getRemoteParticipants()
    .sort((participantA, participantB) => sortUsersByPriority(participantA.user, participantB.user));
  const remoteVideoParticipants = remoteParticipants.filter(participant => participant.hasActiveVideo());
  if (remoteParticipants.length === 1) {
    inGridParticipants = remoteVideoParticipants;
    thumbnailParticipant = selfParticipant;
  } else {
    inGridParticipants = [selfParticipant, ...remoteVideoParticipants];
    thumbnailParticipant = null;
  }

  return {
    grid: inGridParticipants,
    thumbnail: thumbnailParticipant,
  };
}
