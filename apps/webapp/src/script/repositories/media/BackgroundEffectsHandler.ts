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

import {Metrics, QualityMode, QualityTier} from 'Repositories/media/BackgroundEffects';
import {CapabilityInfo} from 'Repositories/media/BackgroundEffects/types';
import {
  BackgroundEffectSelection,
  BackgroundSource,
  BLUR_STRENGTHS,
  DEFAULT_BACKGROUND_EFFECT,
  DEFAULT_BUILTIN_BACKGROUND_ID,
  loadBackgroundSource,
} from 'Repositories/media/VideoBackgroundEffects';
import {getStorage} from 'Util/localStorage';
import {getLogger, Logger} from 'Util/Logger';

import {BackgroundEffectsController} from './BackgroundEffects/effects/BackgroundEffectsController';

export const TARGET_FPS = 15;

const VIDEO_BACKGROUND_EFFECT_STORAGE_KEY = 'video-background-effects';
const VIDEO_BACKGROUND_EFFECTS_FEATURE_STORAGE_KEY = 'video-background-effects-feature-enabled';

export class BackgroundEffectsHandler {
  private readonly logger: Logger = getLogger('BackgroundEffectsHandler');
  public readonly isVideoBackgroundEffectsFeatureEnabled = observable<boolean>(false);
  public readonly backgroundEffectedVideoStream = observable<ReleasableMediaStream | undefined>();
  public readonly preferredBackgroundEffect = observable<BackgroundEffectSelection>(DEFAULT_BACKGROUND_EFFECT);
  public readonly metrics = observable<RenderMetrics | undefined>(undefined);
  private readonly storage: Storage | undefined;
  private customBackground: BackgroundSource | undefined = undefined;

  constructor(private readonly controller: BackgroundEffectsController) {
    this.storage = getStorage();
    this.isVideoBackgroundEffectsFeatureEnabled(this.readFeatureEnabledStateFromStore());
    this.preferredBackgroundEffect(this.readPreferredBackgroundEffectFromStore());
    this.preferredBackgroundEffect
      .extend({rateLimit: 500})
      .subscribe(effect => this.savePreferredBackgroundEffectInStore(effect));
  }

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
        onMetrics: (metrics: Metrics) => this.onMetrics(metrics),
      });
      const processedStream = new MediaStream([outputTrack]);
      this.backgroundEffectedVideoStream(
        new ReleasableMediaStream(processedStream, () => {
          stop();
          outputTrack.stop();
        }),
      );
    } catch (error) {
      await this.controller.stop();
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

  public isBackgroundEffectEnabled(): boolean {
    return this.isVideoBackgroundEffectsFeatureEnabled() && this.preferredBackgroundEffect().type !== 'none';
  }

  public readFeatureEnabledStateFromStore(): boolean {
    if (this.storage === undefined) {
      return false;
    }

    try {
      const isEnabled = this.storage.getItem(VIDEO_BACKGROUND_EFFECTS_FEATURE_STORAGE_KEY);
      return isEnabled === 'true';
    } catch (error) {
      console.error('Failed to read video background effect feature state', error);
      return false;
    }
  }

  public saveFeatureEnabledStateInStore(flag: boolean): boolean {
    if (this.storage === undefined) {
      this.isVideoBackgroundEffectsFeatureEnabled(flag);
      return false;
    }

    try {
      this.storage.setItem(VIDEO_BACKGROUND_EFFECTS_FEATURE_STORAGE_KEY, `${flag}`);
    } catch (error) {
      console.error('Failed to persisted video background effect feature state', error);
      this.isVideoBackgroundEffectsFeatureEnabled(flag);
      return false;
    }
    this.isVideoBackgroundEffectsFeatureEnabled(flag);
    return flag;
  }

  private readPreferredBackgroundEffectFromStore(): BackgroundEffectSelection {
    if (this.storage === undefined) {
      return DEFAULT_BACKGROUND_EFFECT;
    }

    try {
      const stored = this.storage.getItem(VIDEO_BACKGROUND_EFFECT_STORAGE_KEY);
      if (stored === null) {
        return DEFAULT_BACKGROUND_EFFECT;
      }

      const parsed = JSON.parse(stored);

      if (!parsed?.type) {
        return DEFAULT_BACKGROUND_EFFECT;
      }

      return parsed as BackgroundEffectSelection;
    } catch (error) {
      console.error('Failed to read persisted preferred video background effect', error);
      return DEFAULT_BACKGROUND_EFFECT;
    }
  }

  private savePreferredBackgroundEffectInStore(effect: BackgroundEffectSelection): void {
    if (this.storage === undefined) {
      return;
    }

    try {
      const serialized = JSON.stringify(effect);
      this.storage.setItem(VIDEO_BACKGROUND_EFFECT_STORAGE_KEY, serialized);
    } catch (error) {
      this.logger.error('Failed to persis preferred video background effect', error);
    }
  }

  public applyQuality(quality: QualityMode) {
    this.controller.setQuality(quality);
  }

  public getQuality(): QualityMode {
    return this.controller.getQuality();
  }

  public allowSuperhighQualityTier(allow: boolean) {
    if (allow) {
      this.controller.setMaxQualityTier('superhigh');
    } else {
      this.controller.setMaxQualityTier('high');
    }
  }

  public isSuperhighQualityTierAllowed(): boolean {
    return this.controller.getMaxQualityTier() !== 'superhigh';
  }

  public getModel(): string {
    return 'Model--xxxx';
  }

  getCapabilityInfo(): CapabilityInfo {
    return this.controller.getCapabilityInfo();
  }

  private onMetrics(metrics: Metrics): void {
    const budget = 1000 / TARGET_FPS;
    const total = metrics.avgTotalMs || 0;
    const utilShare = budget > 0 ? Math.min(999, (total / budget) * 100) : 0;
    const mlShare = total > 0 ? (metrics.avgSegmentationMs / total) * 100 : 0;
    const webglShare = total > 0 ? (metrics.avgGpuMs / total) * 100 : 0;
    // Label ML phase based on an actual delegate type
    const ml = metrics.segmentationDelegate ? `ML(${metrics.segmentationDelegate})` : 'ML';
    const renderMetrics = {...metrics, webglShare, utilShare, mlShare, budget, ml} as RenderMetrics;
    this.metrics(renderMetrics);
  }
}

export class ReleasableMediaStream {
  constructor(
    public stream: MediaStream,
    public release: () => void = () => null,
  ) {}
}

export interface RenderMetrics extends Metrics {
  budget: number;
  utilShare: number;
  mlShare: number;
  webglShare: number;
  ml: 'ML(CPU)' | 'ML(GPU)' | 'ML';
  tier: QualityTier;
}
