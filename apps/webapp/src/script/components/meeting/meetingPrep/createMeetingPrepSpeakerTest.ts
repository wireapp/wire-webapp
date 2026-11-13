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

import {Task} from 'true-myth';

import {
  meetingPrepSpeakerTestErrors,
  type MeetingPrepSpeakerTestError,
  type PlayMeetingPrepSpeakerTest,
} from './meetingPrepTypes';

import {AudioType} from '../../../repositories/audio/audioType';
import {defaultAudioOutputId} from '../../../repositories/media/useMediaDevicesStore';

/** The same file the app plays when a call is ready, served from the app's audio folder. */
export const MEETING_PREP_SPEAKER_TEST_SOURCE = `./audio/${AudioType.READY_TO_TALK}.mp3`;

/**
 * The speaker test of the green room. It uses its own audio element on purpose: the app's sound
 * player follows the "sounds off" preference, and a test the user asked for must play anyway.
 * If the browser refuses the chosen output (Firefox without media permission), it plays on the
 * default output rather than stay silent, as the app's sound player does.
 * The task settles when the sound ends or stops (a headset unplugged pauses it).
 */
export const createMeetingPrepSpeakerTest = (
  createAudio: (source: string) => HTMLAudioElement,
): PlayMeetingPrepSpeakerTest => {
  return speakerDeviceId => {
    return new Task<void, MeetingPrepSpeakerTestError>((resolve, reject) => {
      const audio = createAudio(MEETING_PREP_SPEAKER_TEST_SOURCE);

      const settle = (outcome: 'done' | 'failed'): void => {
        audio.removeEventListener('ended', onDone);
        audio.removeEventListener('pause', onDone);
        audio.removeEventListener('error', onFailed);
        if (outcome === 'done') {
          resolve();
          return;
        }
        reject(meetingPrepSpeakerTestErrors.playbackFailed);
      };
      const onDone = (): void => {
        settle('done');
      };
      const onFailed = (): void => {
        settle('failed');
      };

      audio.addEventListener('ended', onDone);
      audio.addEventListener('pause', onDone);
      audio.addEventListener('error', onFailed);

      // Not routed for the default output (Firefox has no "default" sink id), nor where the browser cannot.
      const isChosenOutput = speakerDeviceId.length > 0 && speakerDeviceId !== defaultAudioOutputId;
      const routed =
        isChosenOutput && typeof audio.setSinkId === 'function'
          ? audio.setSinkId(speakerDeviceId).catch(() => {
              return undefined;
            })
          : Promise.resolve();

      void routed
        .then(() => {
          return audio.play();
        })
        .catch(onFailed);
    });
  };
};
