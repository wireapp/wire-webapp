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

import {Maybe} from 'true-myth';
import {match} from 'ts-pattern';

import type {TranslationKey} from '../../../util/localizerUtil/translationTypes';

export type MicrophoneHealth = 'off' | 'starting' | 'working' | 'blocked';
export type CameraHealth = 'off' | 'starting' | 'working' | 'unavailable';

interface DeviceState {
  readonly isEnabled: boolean;
  readonly hasStream: boolean;
}

/** A microphone the browser refused stays blocked until the user tries again, even once it is off. */
export const getMicrophoneHealth = ({
  isBlocked,
  isEnabled,
  hasStream,
}: DeviceState & {readonly isBlocked: boolean}): MicrophoneHealth => {
  if (isBlocked) {
    return 'blocked';
  }
  if (!isEnabled) {
    return 'off';
  }
  return hasStream ? 'working' : 'starting';
};

/** A camera that failed to start stays unavailable until the user tries again, even once it is off. */
export const getCameraHealth = ({
  isUnavailable,
  isEnabled,
  hasStream,
}: DeviceState & {readonly isUnavailable: boolean}): CameraHealth => {
  if (isUnavailable) {
    return 'unavailable';
  }
  if (!isEnabled) {
    return 'off';
  }
  return hasStream ? 'working' : 'starting';
};

export interface MeetingPrepSetupCallout {
  readonly tone: 'success' | 'warning';
  readonly status: TranslationKey;
  readonly hint: Maybe<TranslationKey>;
}

interface MeetingPrepSetupInput {
  readonly microphone: MicrophoneHealth;
  readonly camera: CameraHealth;
}

const success = (status: TranslationKey): Maybe<MeetingPrepSetupCallout> => {
  return Maybe.just<MeetingPrepSetupCallout>({tone: 'success', status, hint: Maybe.nothing()});
};

const warning = (status: TranslationKey, hint: TranslationKey): Maybe<MeetingPrepSetupCallout> => {
  return Maybe.just<MeetingPrepSetupCallout>({tone: 'warning', status, hint: Maybe.just(hint)});
};

/**
 * The setup callout above the device rows. It only claims what the browser reports: access granted
 * and a live stream. A blocked microphone comes first, because the user cannot be heard. Nothing
 * when both devices are off by choice or still starting.
 */
export const getMeetingPrepSetupCallout = ({
  microphone,
  camera,
}: MeetingPrepSetupInput): Maybe<MeetingPrepSetupCallout> => {
  return match({microphone, camera})
    .returnType<Maybe<MeetingPrepSetupCallout>>()
    .with({microphone: 'blocked'}, () => {
      return warning('meetings.prep.setupMicrophoneBlocked', 'meetings.prep.setupMicrophoneBlockedHint');
    })
    .with({camera: 'unavailable'}, () => {
      return warning('meetings.prep.setupCameraUnavailable', 'meetings.prep.setupCameraUnavailableHint');
    })
    .with({microphone: 'working', camera: 'working'}, () => {
      return success('meetings.prep.setupMicrophoneAndCameraWorking');
    })
    .with({microphone: 'working'}, () => {
      return success('meetings.prep.setupMicrophoneWorking');
    })
    .with({camera: 'working'}, () => {
      return success('meetings.prep.setupCameraWorking');
    })
    .otherwise(() => {
      return Maybe.nothing();
    });
};
