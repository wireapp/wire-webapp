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

import {Call} from './Call';
import type {Participant} from './Participant';

export interface Grid {
  grid: Participant[];
  thumbnail: Participant | null;
}

export function getGrid(call: Call) {
  if (call.participants()?.length === 2) {
    return {
      grid: call.getRemoteParticipants(),
      thumbnail: call.getSelfParticipant(),
    };
  }
  return {
    grid: call.pages()[call.currentPage()] ?? [],
    thumbnail: null,
  };
}

export const useVideoGrid = (call: Call): Grid => {
  const [grid, setGrid] = useState<Grid>();
  const {participants, currentPage, pages} = useKoSubscribableChildren(call, ['participants', 'currentPage', 'pages']);

  useEffect(() => {
    if (!call) {
      return setGrid(undefined);
    }
    const updateGrid = () => {
      call.updatePages();
      setGrid(getGrid(call));
    };
    updateGrid();
    const nameSubscriptions = participants?.map(p => p.user.name.subscribe(updateGrid));
    const videoSubscriptions = participants?.map(p => p.isSendingVideo.subscribe(updateGrid));
    const screenShareSubscriptions = participants?.map(p => p.sharesScreen.subscribe(updateGrid));
    return () => {
      nameSubscriptions?.forEach(s => s.dispose());
      videoSubscriptions?.forEach(s => s.dispose());
      screenShareSubscriptions?.forEach(s => s.dispose());
    };
  }, [participants, participants?.length, call, currentPage, pages?.length]);

  return grid;
};
