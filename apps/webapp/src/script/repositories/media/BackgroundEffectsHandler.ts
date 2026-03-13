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
import {
  BackgroundEffectSelection,
  BackgroundSource,
  BLUR_STRENGTHS,
  DEFAULT_BACKGROUND_EFFECT,
  DEFAULT_BUILTIN_BACKGROUND_ID,
  loadBackgroundSource,
} from 'Repositories/media/VideoBackgroundEffects';
import {getLogger, Logger} from 'Util/Logger';

export const TARGET_FPS = 15;

export class BackgroundEffectsHandler {
  private readonly logger: Logger = getLogger('BackgroundEffectsHandler');
  public readonly backgroundEffectedVideoStream = observable<ReleasableMediaStream | undefined>();
  public readonly preferredBackgroundEffect = observable<BackgroundEffectSelection>(DEFAULT_BACKGROUND_EFFECT);
  private customBackground: BackgroundSource | undefined = undefined;

  constructor(private readonly controller: BackgroundEffectsController) {}

  public async applyBackgroundEffect(
    originalVideoStream: MediaStream,
  ): Promise<{applied: boolean; media: ReleasableMediaStream}> {
    if (this.preferredBackgroundEffect().type === 'none') {
      // No background changes wanted nothing to do
      return {applied: false, media: new ReleasableMediaStream(originalVideoStream)};
    }

    const videoTrack = originalVideoStream.getVideoTracks()[0];

    if (!videoTrack) {
      // No input video track, nothing to do
      return {applied: false, media: new ReleasableMediaStream(originalVideoStream)};
    }

    const effect = this.preferredBackgroundEffect();
    const isVirtual = effect.type === 'virtual' || effect.type === 'custom';
    const blurStrength = effect.type === 'blur' ? BLUR_STRENGTHS[effect.level] : BLUR_STRENGTHS.high;

    if (this.controller.isProcessing()) {
      // this.controller.stop();
    }

    const backgroundSource: BackgroundSource | undefined = isVirtual
      ? await this.loadBackgroundSource(effect)
      : undefined;

    try {
      const {outputTrack, stop} = await this.controller.start(videoTrack, {
        mode: isVirtual ? 'virtual' : 'blur',
        blurStrength,
        quality: 'auto',
        targetFps: TARGET_FPS,
        debugMode: 'off',
        ...(isVirtual && backgroundSource ? {backgroundImage: backgroundSource} : {}),
      });
      const processedStream = new MediaStream([outputTrack]);
      this.backgroundEffectedVideoStream(
        new ReleasableMediaStream(processedStream, () => {
          stop();
          outputTrack.stop();
        }),
      );
    } catch (error) {
      this.controller.stop();
      this.logger.warn('BackgroundEffectsController failed with error:', error);
      return {applied: false, media: new ReleasableMediaStream(originalVideoStream)};
    }

    if (this.backgroundEffectedVideoStream()?.stream === undefined) {
      return {applied: false, media: new ReleasableMediaStream(originalVideoStream)};
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

    return {applied: true, media: this.backgroundEffectedVideoStream()};
  }

  public setPreferredBackgroundEffect(effect: BackgroundEffectSelection, customBackground?: BackgroundSource) {
    this.preferredBackgroundEffect(effect);
    if (effect.type === 'custom') {
      if (!customBackground) {
        this.preferredBackgroundEffect({type: 'virtual', backgroundId: DEFAULT_BUILTIN_BACKGROUND_ID});
        this.logger.warn('No cusstom backgound image was set, switch to default virtuell Back ground');
      }
      this.customBackground = customBackground;
    }
  }

  /**
   * Load virtual or custom background
   *
   * @param effect BackgroundEffectSelection
   * @private
   */
  private async loadBackgroundSource(effect: BackgroundEffectSelection): Promise<BackgroundSource | undefined> {
    let backgroundSource: BackgroundSource | undefined = undefined;
    try {
      if (effect.type === 'virtual') {
        backgroundSource = await loadBackgroundSource(effect.backgroundId);
      } else if (effect.type === 'custom') {
        if (!this.customBackground) {
          this.logger.warn('Failed to load custom background source');
        }
        backgroundSource = this.customBackground;
      }
    } catch (error) {
      this.logger.warn('Failed to load background source', error);
    }

    return backgroundSource;
  }

  public isBackgroundEffectEnabled() {
    return this.preferredBackgroundEffect().type !== 'none';
  }
}

export class ReleasableMediaStream {
  constructor(
    public stream: MediaStream,
    public release: () => void = () => null,
  ) {}
}
