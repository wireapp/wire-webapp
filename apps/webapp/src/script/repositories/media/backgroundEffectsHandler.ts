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

import {Metrics, QualityMode} from 'Repositories/media/backgroundEffects';
import {CapabilityInfo} from 'Repositories/media/backgroundEffects/backgroundEffectsWorkerTypes';
import {BackgroundEffectsController} from 'Repositories/media/backgroundEffects/effects/backgroundEffectsController';
import {
  BackgroundEffectSelection,
  BackgroundSource,
  BLUR_STRENGTHS,
  DEFAULT_BACKGROUND_EFFECT,
  DEFAULT_BUILTIN_BACKGROUND_ID,
  loadBackgroundSource,
} from 'Repositories/media/VideoBackgroundEffects';
import {getStorage} from 'Util/localStorage';
import {getLogger, Logger} from 'Util/logger';

import {backgroundEffectsStore, RenderMetrics} from './useBackgroundEffectsStore';

export const TARGET_FPS = 15;
export const DEBOUNCE_TIMER = 500;

const VIDEO_BACKGROUND_EFFECT_STORAGE_KEY = 'video-background-effects';
const VIDEO_BACKGROUND_EFFECTS_FEATURE_STORAGE_KEY = 'video-background-effects-feature-enabled';

const isVirtualEffect = (effect: BackgroundEffectSelection): boolean =>
  effect.type === 'virtual' || effect.type === 'custom';

const getBlurStrength = (effect: BackgroundEffectSelection) =>
  effect.type === 'blur' ? BLUR_STRENGTHS[effect.level] : BLUR_STRENGTHS.high;

const computeRenderMetrics = (metrics: Metrics): RenderMetrics => {
  const budget = 1000 / TARGET_FPS;
  const total = metrics.avgTotalMs || 0;
  const utilShare = budget > 0 ? Math.min(999, (total / budget) * 100) : 0;
  const mlShare = total > 0 ? (metrics.avgSegmentationMs / total) * 100 : 0;
  const webglShare = total > 0 ? (metrics.avgGpuMs / total) * 100 : 0;
  const ml = metrics.segmentationDelegate ? `ML(${metrics.segmentationDelegate})` : 'ML';

  return {
    ...metrics,
    webglShare,
    utilShare,
    mlShare,
    budget,
    ml,
  } as RenderMetrics;
};

const parseStoredPreferredEffect = (stored: string | null): BackgroundEffectSelection => {
  if (stored === null) {
    return DEFAULT_BACKGROUND_EFFECT;
  }

  try {
    const parsed = JSON.parse(stored);

    if (!parsed?.type) {
      return DEFAULT_BACKGROUND_EFFECT;
    }

    return parsed as BackgroundEffectSelection;
  } catch {
    return DEFAULT_BACKGROUND_EFFECT;
  }
};

export class BackgroundEffectsHandler {
  private readonly logger: Logger = getLogger('BackgroundEffectsHandler');
  private readonly storage: Storage | undefined;
  private customBackground: BackgroundSource | undefined = undefined;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentReleasableStream: ReleasableMediaStream | undefined = undefined;

  constructor(private readonly controller: BackgroundEffectsController) {
    this.storage = getStorage();
    backgroundEffectsStore.getState().setIsFeatureEnabled(this.readFeatureEnabledStateFromStore());
    backgroundEffectsStore.getState().setPreferredEffect(this.readPreferredBackgroundEffectFromStore());

    backgroundEffectsStore.subscribe((state, prevState) => {
      if (state.preferredEffect !== prevState.preferredEffect) {
        if (this.saveDebounceTimer) {
          clearTimeout(this.saveDebounceTimer);
        }
        this.saveDebounceTimer = setTimeout(
          () => this.savePreferredBackgroundEffectInStore(state.preferredEffect),
          DEBOUNCE_TIMER,
        );
      }
    });
  }

  public async applyBackgroundEffect(
    originalVideoStream: MediaStream,
  ): Promise<{applied: boolean; media: ReleasableMediaStream}> {
    const {preferredEffect} = backgroundEffectsStore.getState();

    if (preferredEffect.type === 'none') {
      return {applied: false, media: new ReleasableMediaStream(originalVideoStream)};
    }

    const videoTrack = originalVideoStream.getVideoTracks()[0];

    if (!videoTrack) {
      return {applied: false, media: new ReleasableMediaStream(originalVideoStream)};
    }

    const isVirtual = isVirtualEffect(preferredEffect);
    const blurStrength = getBlurStrength(preferredEffect);
    const backgroundSource = isVirtual ? await this.loadBackgroundSource(preferredEffect) : undefined;

    if (this.controller.isProcessing() && this.currentReleasableStream) {
      if (isVirtual) {
        this.controller.setMode('virtual');
        if (backgroundSource) {
          this.controller.setBackgroundSource(backgroundSource);
        }
      } else {
        this.controller.setMode('blur');
        this.controller.setBlurStrength(blurStrength);
      }
      return {applied: true, media: this.currentReleasableStream};
    }

    try {
      const {outputTrack, stop} = await this.controller.start(videoTrack, {
        mode: isVirtual ? 'virtual' : 'blur',
        blurStrength,
        quality: 'auto',
        targetFps: TARGET_FPS,
        debugMode: 'off',
        ...(isVirtual && backgroundSource ? {backgroundImage: backgroundSource} : {}),
        onMetrics: this.onMetrics,
        onModelChange: this.onModelChange,
      });
      const processedStream = new MediaStream([outputTrack]);
      this.currentReleasableStream = new ReleasableMediaStream(processedStream, () => {
        this.currentReleasableStream = undefined;
        stop();
        outputTrack.stop();
      });

      return {applied: true, media: this.currentReleasableStream};
    } catch (error) {
      await this.controller.stop();
      this.logger.warn('BackgroundEffectsController failed with error:', error);
      return {applied: false, media: new ReleasableMediaStream(originalVideoStream)};
    }
  }

  public setPreferredBackgroundEffect(effect: BackgroundEffectSelection, customBackground?: BackgroundSource): void {
    if (effect.type === 'custom' && !customBackground) {
      backgroundEffectsStore
        .getState()
        .setPreferredEffect({type: 'virtual', backgroundId: DEFAULT_BUILTIN_BACKGROUND_ID});
      this.logger.warn('No custom background image was set, switch to default virtual background');
      return;
    }

    if (effect.type === 'custom') {
      this.customBackground = customBackground;
    }

    backgroundEffectsStore.getState().setPreferredEffect(effect);
  }

  public isBackgroundEffectEnabled(): boolean {
    const {isFeatureEnabled, preferredEffect} = backgroundEffectsStore.getState();
    return isFeatureEnabled && preferredEffect.type !== 'none';
  }

  public readFeatureEnabledStateFromStore(): boolean {
    if (this.storage === undefined) {
      return false;
    }

    try {
      return this.storage.getItem(VIDEO_BACKGROUND_EFFECTS_FEATURE_STORAGE_KEY) === 'true';
    } catch (error) {
      console.error('Failed to read video background effect feature state', error);
      return false;
    }
  }

  public saveFeatureEnabledStateInStore(flag: boolean): boolean {
    backgroundEffectsStore.getState().setIsFeatureEnabled(flag);

    if (this.storage === undefined) {
      return false;
    }

    try {
      this.storage.setItem(VIDEO_BACKGROUND_EFFECTS_FEATURE_STORAGE_KEY, `${flag}`);
      return flag;
    } catch (error) {
      console.error('Failed to persist video background effect feature state', error);
      return false;
    }
  }

  public applyQuality(quality: QualityMode): void {
    this.controller.setQuality(quality);
  }

  public getQuality(): QualityMode {
    return this.controller.getQuality();
  }

  public enableSuperhighQualityTier(enable: boolean): void {
    this.controller.setMaxQualityTier(enable ? 'superhigh' : 'high');
  }

  public isSuperhighQualityTierAllowed(): boolean {
    return this.controller.getMaxQualityTier() === 'superhigh';
  }

  public getCapabilityInfo(): CapabilityInfo {
    return this.controller.getCapabilityInfo();
  }

  private async loadBackgroundSource(effect: BackgroundEffectSelection): Promise<BackgroundSource | undefined> {
    try {
      if (effect.type === 'virtual') {
        return await loadBackgroundSource(effect.backgroundId);
      }

      if (effect.type === 'custom') {
        if (!this.customBackground) {
          this.logger.warn('Failed to load custom background source');
        }
        return this.customBackground;
      }

      return undefined;
    } catch (error) {
      this.logger.warn('Failed to load background source', error);
      return undefined;
    }
  }

  private readPreferredBackgroundEffectFromStore(): BackgroundEffectSelection {
    if (this.storage === undefined) {
      return DEFAULT_BACKGROUND_EFFECT;
    }

    try {
      return parseStoredPreferredEffect(this.storage.getItem(VIDEO_BACKGROUND_EFFECT_STORAGE_KEY));
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
      this.logger.error('Failed to persist preferred video background effect', error);
    }
  }

  private onMetrics = (metrics: Metrics): void => {
    backgroundEffectsStore.getState().setMetrics(computeRenderMetrics(metrics));
  };

  private onModelChange = (modelPath: string): void => {
    const model = modelPath.split('/').pop();
    backgroundEffectsStore.getState().setModel(model);
  };
}

export class ReleasableMediaStream {
  constructor(
    public stream: MediaStream,
    public release: () => void = () => null,
  ) {}
}
