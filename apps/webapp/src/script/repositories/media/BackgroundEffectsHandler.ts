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

import {observable} from 'knockout';

import {BackgroundEffectsController} from 'Repositories/media/BackgroundEffects';
import {BackgroundEffectSelection, BackgroundSource, BLUR_STRENGTHS} from 'Repositories/media/VideoBackgroundEffects';
import {getLogger, Logger} from 'Util/Logger';

export class BackgroundEffectsHandler {
  private readonly logger: Logger = getLogger('BackgroundEffectsHandler');
  private readonly controller: BackgroundEffectsController = new BackgroundEffectsController();
  public readonly backgroundEffectedVideoStream = observable<{stream: MediaStream; release: () => void} | undefined>();

  public async applyBackgroundEffect(
    originalVideoStream: MediaStream,
    effect: BackgroundEffectSelection,
    backgroundSource?: BackgroundSource,
  ): Promise<MediaStream | undefined> {
    if (effect.type === 'none') {
      // No background changes wanted nothing to do
      return originalVideoStream;
    }

    const videoTrack = originalVideoStream.getVideoTracks()[0];

    if (!videoTrack) {
      // No input video track, nothing to do
      return originalVideoStream;
    }

    const isVirtual = effect.type === 'virtual' || effect.type === 'custom';
    const blurStrength = effect.type === 'blur' ? BLUR_STRENGTHS[effect.level] : BLUR_STRENGTHS.high;

    if (this.controller.isProcessing()) {
      this.controller.stop();
    }

    try {
      const {outputTrack, stop} = await this.controller.start(videoTrack, {
        mode: isVirtual ? 'virtual' : 'blur',
        blurStrength,
        quality: 'auto',
        targetFps: 15,
        debugMode: 'off',
        ...(isVirtual && backgroundSource ? {backgroundImage: backgroundSource} : {}),
      });
      const processedStream = new MediaStream([outputTrack]);
      this.backgroundEffectedVideoStream({
        stream: processedStream,
        release: () => {
          stop();
          outputTrack.stop();
        },
      });
    } catch (error) {
      this.controller.stop();
      this.logger.warn('BackgroundEffectsController failed with error:', error);
      return originalVideoStream;
    }

    if (this.backgroundEffectedVideoStream()?.stream === undefined) {
      return originalVideoStream;
    }

    if (isVirtual) {
      this.controller.setMode('virtual');
      if (backgroundSource) {
        this.controller.setBackgroundSource(backgroundSource);
      }
    } else {
      this.controller.setMode('blur');
      this.controller.setBlurStrength(blurStrength);
    }

    return this.backgroundEffectedVideoStream().stream;
  }
}
