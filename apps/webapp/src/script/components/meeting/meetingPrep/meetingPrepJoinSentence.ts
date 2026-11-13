/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {match} from 'ts-pattern';

import type {TranslationKey} from '../../../util/localizerUtil/translationTypes';

interface MeetingPrepJoinState {
  readonly microphoneEnabled: boolean;
  readonly cameraEnabled: boolean;
}

/**
 * The sentence under the Join button: how the user joins. Why a device is off is the setup
 * callout's job, so the sentence never repeats it.
 */
export const getMeetingPrepJoinSentenceKey = ({
  microphoneEnabled,
  cameraEnabled,
}: MeetingPrepJoinState): TranslationKey => {
  return match({microphoneEnabled, cameraEnabled})
    .returnType<TranslationKey>()
    .with({microphoneEnabled: true, cameraEnabled: true}, () => {
      return 'meetings.prep.joinMicrophoneAndCamera';
    })
    .with({microphoneEnabled: true, cameraEnabled: false}, () => {
      return 'meetings.prep.joinMicrophoneOnly';
    })
    .with({microphoneEnabled: false, cameraEnabled: true}, () => {
      return 'meetings.prep.joinCameraOnly';
    })
    .with({microphoneEnabled: false, cameraEnabled: false}, () => {
      return 'meetings.prep.joinMuted';
    })
    .exhaustive();
};
