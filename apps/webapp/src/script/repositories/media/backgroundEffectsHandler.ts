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

import {isNullOrUndefined} from '@sindresorhus/is';
import type {BackgroundInput, PipelineStats} from 'longpipe';
import {noop} from 'noop-esm';

import {BACKGROUND_RESOLUTIONS, type QualityMode} from './backgroundEffectsResolution';
import {isBackgroundEffectsSupported} from './backgroundEffectsSupport';
import {
  createLongpipeBackgroundSession,
  type BackgroundEffectsSession,
  type BackgroundSessionOptions,
  type BackgroundFrameSizes,
  type BackgroundFpsDiagnostics,
} from './longpipeBackgroundEffects';
import {BackgroundEffectsQuality, backgroundEffectsStore} from './useBackgroundEffectsStore';
import {
  BackgroundEffectSelection,
  BackgroundSource,
  DEFAULT_BACKGROUND_EFFECT,
  DEFAULT_BUILTIN_BACKGROUND_ID,
  loadBackgroundSource,
} from './VideoBackgroundEffects';

import {getStorage} from '../../util/localStorage';
import {getLogger, Logger} from '../../util/logger';

type BackgroundEffectApplicationResult = {applied: boolean; media: ReleasableMediaStream};

export const DEBOUNCE_TIMER = 500;

const VIDEO_BACKGROUND_EFFECT_STORAGE_KEY = 'video-background-effects';
export const VIDEO_BACKGROUND_EFFECTS_PERFORMANCE_PANEL_STORAGE_KEY = 'video-background-effects-feature-enabled';
const VIDEO_BACKGROUND_LAST_VIRTUAL_ID_STORAGE_KEY = 'video-background-effects-last-virtual-id';
const QUALITY_RESOLUTION_LIMITS = {
  privacy: BACKGROUND_RESOLUTIONS.fhd.width,
  balanced: BACKGROUND_RESOLUTIONS.hd.width,
  performance: BACKGROUND_RESOLUTIONS.nhd.width,
};

const parseStoredPreferredEffect = (stored: string | null): BackgroundEffectSelection => {
  if (stored === null) {
    return DEFAULT_BACKGROUND_EFFECT;
  }

  try {
    const parsed: unknown = JSON.parse(stored);
    const parsedType =
      isNullOrUndefined(parsed) || typeof parsed !== 'object' || !('type' in parsed) ? undefined : parsed.type;

    if (isNullOrUndefined(parsedType) || parsedType === false || parsedType === 0 || parsedType === '') {
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
  private currentInputTrack: MediaStreamTrack | undefined;
  private currentSession: BackgroundEffectsSession | undefined;
  private quality: QualityMode = 'auto';
  private applicationQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly createSession: (
      input: MediaStreamTrack,
      options: BackgroundSessionOptions,
    ) => Promise<BackgroundEffectsSession> = createLongpipeBackgroundSession,
  ) {
    this.storage = getStorage();
    backgroundEffectsStore.getState().setIsPerformancePanelEnabled(this.readPerformancePanelEnabledFromStore());

    const storedEffect = this.readPreferredBackgroundEffectFromStore();
    const isWebGLAvailable = isBackgroundEffectsSupported();
    const effectToApply = !isWebGLAvailable && storedEffect.type !== 'none' ? DEFAULT_BACKGROUND_EFFECT : storedEffect;

    if (!isWebGLAvailable && storedEffect.type !== 'none') {
      this.savePreferredBackgroundEffectInStore(DEFAULT_BACKGROUND_EFFECT);
    }

    backgroundEffectsStore.getState().setPreferredEffect(effectToApply);
    backgroundEffectsStore.getState().setLastVirtualBackgroundId(this.readLastVirtualBackgroundIdFromStore());

    backgroundEffectsStore.subscribe((state, prevState) => {
      if (state.preferredEffect !== prevState.preferredEffect) {
        if (!isNullOrUndefined(this.saveDebounceTimer)) {
          clearTimeout(this.saveDebounceTimer);
        }
        this.saveDebounceTimer = setTimeout(() => {
          return this.savePreferredBackgroundEffectInStore(state.preferredEffect);
        }, DEBOUNCE_TIMER);

        if (state.preferredEffect.type === 'virtual') {
          backgroundEffectsStore.getState().setLastVirtualBackgroundId(state.preferredEffect.backgroundId);
          this.saveLastVirtualBackgroundIdInStore(state.preferredEffect.backgroundId);
        }
      }
    });
  }

  public async applyBackgroundEffect(originalVideoStream: MediaStream): Promise<BackgroundEffectApplicationResult> {
    const result = this.applicationQueue.then(() => {
      return this.applyEffect(originalVideoStream);
    });
    this.applicationQueue = result.catch(noop);
    return result;
  }

  private async applyEffect(originalVideoStream: MediaStream): Promise<BackgroundEffectApplicationResult> {
    const {preferredEffect} = backgroundEffectsStore.getState();

    if (preferredEffect.type === 'none') {
      return {applied: false, media: new ReleasableMediaStream(originalVideoStream)};
    }

    const videoTrack = originalVideoStream.getVideoTracks()[0];

    if (isNullOrUndefined(videoTrack)) {
      return {applied: false, media: new ReleasableMediaStream(originalVideoStream)};
    }

    try {
      const background = await this.getLongpipeBackground(preferredEffect);
      if (
        this.currentInputTrack === videoTrack &&
        this.currentSession !== undefined &&
        this.currentReleasableStream !== undefined
      ) {
        await this.currentSession.setBackground(background);
        return {applied: true, media: this.currentReleasableStream};
      }
      const session = await this.createSession(videoTrack, {
        background,
        quality: this.quality,
        maximumLongEdge: QUALITY_RESOLUTION_LIMITS[backgroundEffectsStore.getState().qualityTier],
        onStats: (stats, frameSizes, fps) => {
          if (this.currentSession === session) {
            this.onStats(stats, frameSizes, fps);
          }
        },
      });
      const media = new ReleasableMediaStream(session.stream, () => {
        session.release();
        if (this.currentSession === session) {
          this.currentSession = undefined;
          this.currentInputTrack = undefined;
          this.currentReleasableStream = undefined;
          backgroundEffectsStore.getState().setLongpipeStats(undefined);
          backgroundEffectsStore.getState().setFrameSizes(undefined);
          backgroundEffectsStore.getState().setFpsDiagnostics(undefined);
        }
      });
      session.onTrackChanged = () => {
        media.onTrackChanged?.();
      };
      this.currentSession = session;
      this.currentInputTrack = videoTrack;
      this.currentReleasableStream = media;
      backgroundEffectsStore.getState().setLongpipeStats(undefined);
      backgroundEffectsStore.getState().setFrameSizes(undefined);
      backgroundEffectsStore.getState().setFpsDiagnostics(undefined);
      return {applied: true, media};
    } catch (error) {
      this.logger.warn('Longpipe failed to apply background effects', {error});
      return {applied: false, media: new ReleasableMediaStream(originalVideoStream)};
    }
  }

  public setPreferredBackgroundEffect(
    effect: BackgroundEffectSelection,
    customBackground: BackgroundSource | null = null,
  ): void {
    if (effect.type === 'custom' && isNullOrUndefined(customBackground)) {
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
    return backgroundEffectsStore.getState().preferredEffect.type !== 'none';
  }

  public readPerformancePanelEnabledFromStore(): boolean {
    if (this.storage === undefined) {
      return false;
    }

    try {
      return this.storage.getItem(VIDEO_BACKGROUND_EFFECTS_PERFORMANCE_PANEL_STORAGE_KEY) === 'true';
    } catch (error) {
      this.logger.error('Failed to read video background effects performance panel state', {error});
      return false;
    }
  }

  public savePerformancePanelEnabledStateInStore(flag: boolean): boolean {
    backgroundEffectsStore.getState().setIsPerformancePanelEnabled(flag);

    if (this.storage === undefined) {
      return false;
    }

    try {
      this.storage.setItem(VIDEO_BACKGROUND_EFFECTS_PERFORMANCE_PANEL_STORAGE_KEY, `${flag}`);
      return flag;
    } catch (error) {
      this.logger.error('Failed to persist video background effects performance panel state', {error});
      return false;
    }
  }

  public applyQuality(quality: QualityMode): void {
    this.quality = quality;
    void this.currentSession?.setQuality(quality).catch((error: unknown) => {
      this.logger.warn('Could not change background output resolution', {error});
    });
  }

  public getQuality(): QualityMode {
    return this.quality;
  }

  public setQualityTier(quality: BackgroundEffectsQuality): void {
    backgroundEffectsStore.getState().setQualityTier(quality);
    void this.currentSession?.setMaximumLongEdge(QUALITY_RESOLUTION_LIMITS[quality]).catch((error: unknown) => {
      this.logger.warn('Could not update background resolution limit', {error});
    });
  }

  private async getLongpipeBackground(effect: BackgroundEffectSelection): Promise<BackgroundInput> {
    if (effect.type === 'blur') {
      return {blur: {strength: effect.level}};
    }
    const source = await this.loadBackgroundSource(effect);
    if (source === null) {
      throw new Error('No virtual background image available');
    }
    const media = source.media;
    if (media instanceof HTMLImageElement || (typeof ImageBitmap !== 'undefined' && media instanceof ImageBitmap)) {
      return media;
    }
    return {image: source.url};
  }

  private async loadBackgroundSource(effect: BackgroundEffectSelection): Promise<BackgroundSource | null> {
    try {
      if (effect.type === 'virtual') {
        return await loadBackgroundSource(effect.backgroundId);
      }

      if (effect.type === 'custom') {
        if (isNullOrUndefined(this.customBackground)) {
          this.logger.warn('Failed to load custom background source');
        }
        return this.customBackground;
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to load background source', {error});
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
      this.logger.error('Failed to read persisted preferred video background effect', {error});
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
      this.logger.error('Failed to persist preferred video background effect', {error});
    }
  }

  private readLastVirtualBackgroundIdFromStore(): string {
    if (this.storage === undefined) {
      return DEFAULT_BUILTIN_BACKGROUND_ID;
    }

    try {
      return this.storage.getItem(VIDEO_BACKGROUND_LAST_VIRTUAL_ID_STORAGE_KEY) ?? DEFAULT_BUILTIN_BACKGROUND_ID;
    } catch (error) {
      this.logger.error('Failed to read last virtual background ID', {error});
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
      this.logger.error('Failed to persist last virtual background ID', {error});
    }
  }

  private onStats = (stats: PipelineStats, frameSizes: BackgroundFrameSizes, fps: BackgroundFpsDiagnostics): void => {
    const state = backgroundEffectsStore.getState();
    state.setLongpipeStats(stats);
    state.setFrameSizes(frameSizes);
    state.setFpsDiagnostics(fps);
  };

  public async preloadResources(): Promise<void> {
    // preload default bg image
    await loadBackgroundSource(DEFAULT_BUILTIN_BACKGROUND_ID);

    const {preferredEffect} = backgroundEffectsStore.getState();
    if (preferredEffect.type === 'virtual') {
      await loadBackgroundSource(preferredEffect.backgroundId);
    }
  }
}

export class ReleasableMediaStream {
  public onTrackChanged: (() => void) | undefined;
  constructor(
    public stream: MediaStream,
    public release: () => void = () => {
      return null;
    },
  ) {}
}
