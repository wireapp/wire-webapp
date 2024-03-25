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

import {AudioType} from './AudioType';

interface AudioPlayingType {
  MUTED: AudioType[];
  NONE: AudioType[];
  SOME: AudioType[];
}

const audioPlayingType: AudioPlayingType = {
  MUTED: [],
  NONE: [],
  SOME: [],
};

audioPlayingType.MUTED = [AudioType.CALL_DROP, AudioType.NETWORK_INTERRUPTION];

audioPlayingType.NONE = [
  ...audioPlayingType.MUTED,
  AudioType.OUTGOING_CALL,
  AudioType.READY_TO_TALK,
  AudioType.TALK_LATER,
];

audioPlayingType.SOME = [
  ...audioPlayingType.NONE,
  AudioType.INCOMING_CALL,
  AudioType.INCOMING_PING,
  AudioType.OUTGOING_PING,
];

export const AudioPlayingType = audioPlayingType;
