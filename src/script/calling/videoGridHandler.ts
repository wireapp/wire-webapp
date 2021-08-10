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

import {useEffect, useState} from 'react';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {sortUsersByPriority} from 'Util/StringUtil';

import type {Participant} from '../calling/Participant';
import {Call} from './Call';

export interface Grid {
  grid: Participant[];
  thumbnail: Participant | null;
}

function getGrid(call: Call) {
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

  if (remoteParticipants.length === 1) {
    inGridParticipants = remoteParticipants;
    thumbnailParticipant = selfParticipant;
  } else {
    inGridParticipants = [selfParticipant, ...remoteParticipants];
    thumbnailParticipant = null;
  }

  return {
    grid: inGridParticipants,
    thumbnail: thumbnailParticipant,
  };
}

export const useGrid = (call: Call): Grid => {
  const [grid, setGrid] = useState<Grid>();
  const {participants, currentPage, pages} = useKoSubscribableChildren(call, ['participants', 'currentPage', 'pages']);

  useEffect(() => {
    if (!call) {
      setGrid(undefined);
      return undefined;
    }
    setGrid(getGrid(call));
    const subscriptions = participants?.map(p => {
      return p.user.name.subscribe(() => {
        setGrid(getGrid(call));
      });
    });
    return () => {
      subscriptions?.forEach(s => s.dispose());
    };
  }, [participants?.length, call, currentPage, pages?.length]);

  return grid;
};
