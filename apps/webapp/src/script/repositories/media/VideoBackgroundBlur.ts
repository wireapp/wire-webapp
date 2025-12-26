/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {BackgroundEffectsController} from './BackgroundEffects/effects/BackgroundEffectsController';

/**
 * Will create a new MediaStream that will both segment each frame and apply a blur effect to the background.
 * This is an adapter function that uses the new BackgroundEffects module while maintaining the old API.
 * @param originalStream the stream that contains the video that needs background blur
 * @returns a promise that resolves to an object containing the new MediaStream and a release function to stop the blur process
 */
export async function applyBlur(stream: MediaStream): Promise<{stream: MediaStream; release: () => void}> {
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    throw new Error('No video track found in the provided stream');
  }

  const controller = new BackgroundEffectsController();
  const {outputTrack, stop} = await controller.start(videoTrack, {
    mode: 'blur',
    blurStrength: 0.7,
    quality: 'auto',
    targetFps: 30,
    debugMode: 'off',
  });

  const blurredMediaStream = new MediaStream([outputTrack]);

  return {
    stream: blurredMediaStream,
    release: () => {
      stop();
      outputTrack.stop();
    },
  };
}
