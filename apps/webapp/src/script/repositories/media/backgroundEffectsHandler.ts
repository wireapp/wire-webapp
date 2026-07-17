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

import {container} from 'tsyringe';

import {detectCapabilities, Metrics, QualityMode} from 'Repositories/media/backgroundEffects';
import {BackgroundEffectsController} from 'Repositories/media/backgroundEffects/backgroundEffectsController';
import {CapabilityInfo} from 'Repositories/media/backgroundEffects/backgroundEffectsWorkerTypes';
import {
  defaultOpts,
  SELFIE_MULTICLASS_MODEL_PATH,
  SELFIE_SEGMENTER_MODEL_PATH,
} from 'Repositories/media/backgroundEffects/pipe/options';
import {
  BackgroundEffectSelection,
  BackgroundSource,
  BgStrength,
  BLUR_STRENGTHS,
  DEFAULT_BACKGROUND_EFFECT,
  DEFAULT_BUILTIN_BACKGROUND_ID,
  loadBackgroundSource,
} from 'Repositories/media/VideoBackgroundEffects';
import {TeamState} from 'Repositories/team/TeamState';
import {getStorage} from 'Util/localStorage';
import {getLogger, Logger} from 'Util/logger';

import {backgroundEffectsStore, RenderMetrics} from './useBackgroundEffectsStore';

export const TARGET_FPS = 15;
export const DEBOUNCE_TIMER = 500;

const VIDEO_BACKGROUND_EFFECT_STORAGE_KEY = 'video-background-effects';
export const VIDEO_BACKGROUND_EFFECTS_FEATURE_STORAGE_KEY = 'video-background-effects-feature-enabled';
const VIDEO_BACKGROUND_LAST_VIRTUAL_ID_STORAGE_KEY = 'video-background-effects-last-virtual-id';

const isVirtualEffect = (effect: BackgroundEffectSelection): boolean => {
  return effect.type === 'virtual' || effect.type === 'custom';
};

const getBlurSettings = (effect: BackgroundEffectSelection): BgStrength => {
  return effect.type === 'blur' ? BLUR_STRENGTHS[effect.level] : BLUR_STRENGTHS.high;
};

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
  private customBackground: BackgroundSource | null = null;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentReleasableStream: ReleasableMediaStream | undefined = undefined;

  constructor(
    private readonly controller: BackgroundEffectsController,
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.storage = getStorage();
    const isFeatureEnabled = this.readFeatureEnabledStateFromStore();
    backgroundEffectsStore.getState().setIsFeatureEnabled(isFeatureEnabled);
    backgroundEffectsStore.getState().setIsPerformancePanelEnabled(this.readDebugFeatureEnabledStateFromStore());

    this.teamState.isBackgroundEffectsEnabled.subscribe(() => {
      backgroundEffectsStore.getState().setIsFeatureEnabled(this.readFeatureEnabledStateFromStore());
    });

    const storedEffect = this.readPreferredBackgroundEffectFromStore();
    const isWebGLAvailable = detectCapabilities().webgl2;
    const effectToApply = !isWebGLAvailable && storedEffect.type !== 'none' ? DEFAULT_BACKGROUND_EFFECT : storedEffect;

    if (!isWebGLAvailable && storedEffect.type !== 'none') {
      this.savePreferredBackgroundEffectInStore(DEFAULT_BACKGROUND_EFFECT);
    }

    backgroundEffectsStore.getState().setPreferredEffect(effectToApply);
    backgroundEffectsStore.getState().setLastVirtualBackgroundId(this.readLastVirtualBackgroundIdFromStore());

    backgroundEffectsStore.subscribe((state, prevState) => {
      if (state.preferredEffect !== prevState.preferredEffect) {
        if (this.saveDebounceTimer) {
          clearTimeout(this.saveDebounceTimer);
        }
        this.saveDebounceTimer = setTimeout(
          () => this.savePreferredBackgroundEffectInStore(state.preferredEffect),
          DEBOUNCE_TIMER,
        );

        if (state.preferredEffect.type === 'virtual') {
          backgroundEffectsStore.getState().setLastVirtualBackgroundId(state.preferredEffect.backgroundId);
          this.saveLastVirtualBackgroundIdInStore(state.preferredEffect.backgroundId);
        }
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
    const blurStrength = getBlurSettings(preferredEffect);
    const backgroundSource = isVirtual ? await this.loadBackgroundSource(preferredEffect) : null;

    if (this.controller.isProcessing() && this.currentReleasableStream) {
      if (isVirtual) {
        this.controller.setMode('virtual');
        if (backgroundSource) {
          await this.controller.setBackgroundSource(backgroundSource);
        }
      } else {
        this.controller.setMode('blur');
        this.controller.setBlurStrength(blurStrength);
      }
      return {applied: true, media: this.currentReleasableStream};
    }

    try {
      const outputTrack = await this.controller.start(videoTrack, {
        ...defaultOpts,
        mode: isVirtual ? 'virtual' : 'blur',
        quality: 'auto',
        backgroundSource: isVirtual ? backgroundSource : null,
        bgBlur: blurStrength.bgBlur,
        bgBlurRadius: blurStrength.bgBlurRadius,
        onMetrics: this.onMetrics,
        onModelChange: this.onModelChange,
      });
      const processedStream = new MediaStream([outputTrack]);
      this.currentReleasableStream = new ReleasableMediaStream(processedStream, () => {
        this.currentReleasableStream = undefined;
        outputTrack.stop();
      });

      return {applied: true, media: this.currentReleasableStream};
    } catch (error) {
      this.logger.warn('BackgroundEffectsController failed with error:', error);
      return {applied: false, media: new ReleasableMediaStream(originalVideoStream)};
    }
  }

  public setPreferredBackgroundEffect(
    effect: BackgroundEffectSelection,
    customBackground: BackgroundSource | null = null,
  ): void {
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
    const isEnabledByTeam = this.teamState.isBackgroundEffectsEnabled();

    if (isEnabledByTeam) {
      return true;
    }

    return this.readDebugFeatureEnabledStateFromStore();
  }

  private readDebugFeatureEnabledStateFromStore(): boolean {
    if (this.storage === undefined) {
      return false;
    }

    try {
      return this.storage.getItem(VIDEO_BACKGROUND_EFFECTS_FEATURE_STORAGE_KEY) === 'true';
    } catch (error) {
      this.logger.error('Failed to read video background effect feature state', error);
      return false;
    }
  }

  public saveFeatureEnabledStateInStore(flag: boolean): boolean {
    const isEnabled = this.teamState.isBackgroundEffectsEnabled() || flag;

    backgroundEffectsStore.getState().setIsFeatureEnabled(isEnabled);
    backgroundEffectsStore.getState().setIsPerformancePanelEnabled(flag);

    if (this.storage === undefined) {
      return false;
    }

    try {
      this.storage.setItem(VIDEO_BACKGROUND_EFFECTS_FEATURE_STORAGE_KEY, `${flag}`);
      return flag;
    } catch (error) {
      this.logger.error('Failed to persist video background effect feature state', error);
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
    this.controller.setModelPath(enable ? SELFIE_MULTICLASS_MODEL_PATH : SELFIE_SEGMENTER_MODEL_PATH);
    backgroundEffectsStore.getState().setIsHighQualityBlurEnabled(enable);
  }

  public getCapabilityInfo(): CapabilityInfo {
    return this.controller.getCapabilityInfo();
  }

  private async loadBackgroundSource(effect: BackgroundEffectSelection): Promise<BackgroundSource | null> {
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

      return null;
    } catch (error) {
      this.logger.warn('Failed to load background source', error);
      return null;
    }
  }

  private readPreferredBackgroundEffectFromStore(): BackgroundEffectSelection {
    if (this.storage === undefined) {
      return DEFAULT_BACKGROUND_EFFECT;
    }

    try {
      return parseStoredPreferredEffect(this.storage.getItem(VIDEO_BACKGROUND_EFFECT_STORAGE_KEY));
    } catch (error) {
      this.logger.error('Failed to read persisted preferred video background effect', error);
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

  private readLastVirtualBackgroundIdFromStore(): string {
    if (this.storage === undefined) {
      return DEFAULT_BUILTIN_BACKGROUND_ID;
    }

    try {
      return this.storage.getItem(VIDEO_BACKGROUND_LAST_VIRTUAL_ID_STORAGE_KEY) ?? DEFAULT_BUILTIN_BACKGROUND_ID;
    } catch (error) {
      this.logger.error('Failed to read last virtual background ID', error);
      return DEFAULT_BUILTIN_BACKGROUND_ID;
    }
  }

  private saveLastVirtualBackgroundIdInStore(backgroundId: string): void {
    if (this.storage === undefined) {
      return;
    }

    try {
      this.storage.setItem(VIDEO_BACKGROUND_LAST_VIRTUAL_ID_STORAGE_KEY, backgroundId);
    } catch (error) {
      this.logger.error('Failed to persist last virtual background ID', error);
    }
  }

  private onMetrics = (metrics: Metrics): void => {
    backgroundEffectsStore.getState().setMetrics(computeRenderMetrics(metrics));
  };

  private onModelChange = (modelPath: string): void => {
    const model = modelPath.split('/').pop();
    backgroundEffectsStore.getState().setModel(model);
  };

  public async preloadResources(): Promise<void> {
    if (backgroundEffectsStore.getState().isFeatureEnabled) {
      const {wasmLoaderPath, wasmBinaryPath, modelPath} = defaultOpts;
      // preload media pipe resources
      this.prefetch(wasmLoaderPath);
      this.prefetch(wasmBinaryPath);
      this.prefetch(modelPath);
      // preload default bg image
      await loadBackgroundSource(DEFAULT_BUILTIN_BACKGROUND_ID);

      const {preferredEffect} = backgroundEffectsStore.getState();
      if (preferredEffect.type === 'virtual') {
        await loadBackgroundSource(preferredEffect.backgroundId);
      }
    }
  }

  private prefetch(url: string) {
    const existingPrefetchLink = document.head.querySelector<HTMLLinkElement>(`link[rel="prefetch"][href="${url}"]`);

    if (existingPrefetchLink !== null) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }
}

export class ReleasableMediaStream {
  constructor(
    public stream: MediaStream,
    public release: () => void = () => null,
  ) {}
}
