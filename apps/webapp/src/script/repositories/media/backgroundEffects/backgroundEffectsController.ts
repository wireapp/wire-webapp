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

import {PerformanceSample} from 'Repositories/media/backgroundEffects/helper/samples';
import {
  getBestMatchingQualityTier,
  QualityMode,
  QualityTier,
  Resolution,
  resolutionIsGreaterThanOrEqualTo,
  TIER_DEFINITIONS,
} from 'Repositories/media/backgroundEffects/quality/definitions';
import {QUALITY_TIERS, QualityController} from 'Repositories/media/backgroundEffects/quality/qualityController';
import {backgroundEffectsStore} from 'Repositories/media/useBackgroundEffectsStore';
import {BackgroundSource} from 'Repositories/media/VideoBackgroundEffects';
import {getLogger, Logger} from 'Util/logger';

import {type CapabilityInfo, type EffectMode, type Metrics, Mode} from './backgroundEffectsWorkerTypes';
import {detectCapabilities} from './helper/capability';
import {
  defaultOpts,
  ProcessVideoTrackOptions,
  SELFIE_SEGMENTER_MODEL_PATH,
  WorkerBackgroundSource,
  WorkerProcessVideoTrackOptions,
} from './pipe/options';
import {TrackProcessor} from './pipe/processor';
import {runSegmenter, updateSegmenterOptions} from './pipe/segmenter';

// Blur strength (0–1) maps to Gaussian sigma in pixel units for the shader.
// The shader's blur radius is 30 px, so a sigma in the ~10–20 px range gives
// visually useful blur.  Multiply by this factor to get from the 0–1 range.
const BLUR_SIGMA_SCALE = 15;
const DEFAULT_FRAME_RATE = 15;
const MAX_WIDTH = 256;
const MAX_HEIGHT = 144;

export class BackgroundEffectsController {
  private readonly logger: Logger;

  private inputTrack: MediaStreamTrack | null = null;

  private worker: Worker | null = null;
  private options: ProcessVideoTrackOptions = defaultOpts;

  private onMetrics: ((metrics: Metrics) => void) | null = null;

  private readonly capabilityInfo: CapabilityInfo = {
    offscreenCanvas: false,
    worker: false,
    webgl2: false,
    requestVideoFrameCallback: false,
  };

  private qualityController: QualityController | null = null;
  private qualitySampleQueue = Promise.resolve();
  private maxResolution: Resolution = TIER_DEFINITIONS.hd.resolution;
  private maxQualityTier: QualityTier = 'hd';
  private refcount = 0;

  /**
   * Creates a new background effects controller.
   *
   * Initializes the logger. All other components are initialized when start() is called.
   */
  constructor() {
    this.logger = getLogger('BackgroundEffectsController');
    this.capabilityInfo = detectCapabilities();
  }

  public async start(inputTrack: MediaStreamTrack, options: ProcessVideoTrackOptions): Promise<MediaStreamTrack> {
    this.refcount++;
    const resolved = await resolveOptions(options);

    this.options = withoutBitmap(resolved);
    this.onMetrics = options.onMetrics;

    const trackCapabilities = inputTrack.getCapabilities();
    const trackSettings = inputTrack.getSettings();
    const trackConstraints = inputTrack.getConstraints();
    let {width, height, frameRate} = trackSettings;
    if (!width) {
      width = TIER_DEFINITIONS[QUALITY_TIERS.HD].resolution.width;
    }
    if (!height) {
      height = TIER_DEFINITIONS[QUALITY_TIERS.HD].resolution.height;
    }
    if (!frameRate) {
      frameRate = DEFAULT_FRAME_RATE;
    }
    this.maxResolution = {width, height};
    this.maxQualityTier = getBestMatchingQualityTier(this.maxResolution).tier;
    this.qualityController = new QualityController(frameRate, this.maxQualityTier);

    this.inputTrack = inputTrack;
    this.logger.info(`start: ${width}x${height} ${frameRate}fps`, {
      trackCapabilities,
      trackSettings,
      trackConstraints,
    });

    const {readable} = new TrackProcessor({track: inputTrack});

    const canvas = document.createElement('canvas');
    canvas.width = MAX_WIDTH;
    canvas.height = MAX_HEIGHT;
    const outputTrack = canvas.captureStream(frameRate).getVideoTracks()[0];
    const offscreen = canvas.transferControlToOffscreen();

    const outputTrackStop = outputTrack.stop.bind(outputTrack);
    let onWorkerMessage: ({data}: MessageEvent) => void = () => null;

    if (resolved.useWorker) {
      if (this.worker === null) {
        this.worker = new Worker(/* webpackChunkName: "worker" */ new URL('./pipe/worker', import.meta.url));
      }
      const {options: workerOptions, transferables} = getWorkerOptions(resolved);

      transferables.push(offscreen, readable);

      this.worker.postMessage(
        {name: 'runSegmenter', canvas: offscreen, readable, options: workerOptions},
        transferables,
      );
      onWorkerMessage = ({data}: MessageEvent) => {
        const {name} = data as {name: string};
        if (name === 'stats' && this.onMetrics) {
          const {stats} = data as {stats: Metrics};
          this.onMetrics(stats);
        }

        if (name === 'performanceSample' && this.qualityController !== null) {
          const {sample, mode} = data as {sample: PerformanceSample; mode: Mode};
          this.enqueuePerformanceSample(sample, mode);
        }

        if (name === 'error' && this.qualityController !== null) {
          const {reason, message} = data as {reason: string; message: string};
          this.logger.error(`error received, reason: ${reason}, message: ${message}`);
        }
      };

      this.worker.addEventListener('message', onWorkerMessage);
    } else {
      const {options: workerOptions} = getWorkerOptions(resolved);
      await runSegmenter(
        offscreen,
        readable,
        workerOptions,
        stats => this.onMetrics?.(stats),
        (sample: PerformanceSample, mode: Mode) => {
          this.enqueuePerformanceSample(sample, mode);
        },
      );
    }

    outputTrack.stop = () => {
      this.logger.info('start: outputTrack stop');
      outputTrackStop();

      this.worker?.removeEventListener('message', onWorkerMessage);

      this.refcount--;
      if (!this.refcount) {
        if (this.worker !== null) {
          this.worker.terminate();
          this.worker = null;
        }
      }
    };

    outputTrack.getCapabilities = () => trackCapabilities;
    outputTrack.getSettings = () => trackSettings;
    outputTrack.getConstraints = () => trackConstraints;
    inputTrack.addEventListener('ended', () => outputTrack.stop());

    return outputTrack;
  }

  public setMode(mode: EffectMode): void {
    this.logger.info('Background effects mode', mode);
    const renderFlags = modeToRenderFlags(mode, this.options.blurStrength, this.options.bgBlurRadius);
    this.options = {...this.options, mode, ...renderFlags};
    this.pushOptionsUpdate();
  }

  public setBlurStrength(value: number): void {
    this.options = {
      ...this.options,
      blurStrength: value,
      // Only raise bgBlur when in blur mode; virtual/passthrough use bgBlur=0.
      bgBlur: this.options.mode === 'blur' ? blurStrengthToBgBlur(value) : this.options.bgBlur,
    };
    this.pushOptionsUpdate();
  }

  public async setBackgroundSource(source: BackgroundSource): Promise<void> {
    const {media, url} = source;

    if (media instanceof HTMLImageElement) {
      await createImageBitmap(media)
        .then(bitmap => this.applyImageBitmap(bitmap, url))
        .catch((error: unknown) => this.logger.warn('Failed to set background image', error));
      return;
    }

    if (media instanceof ImageBitmap) {
      this.applyImageBitmap(media, url);
    }
  }

  public async setQuality(quality: QualityMode): Promise<void> {
    this.logger.info('setQuality', quality);

    let requestedQuality = quality;
    if (quality !== 'auto') {
      requestedQuality = await this.changeResolution(quality);
    }

    this.options = {...this.options, quality: requestedQuality};
    this.pushOptionsUpdate();
  }

  public getQuality(): QualityMode {
    return this.options.quality;
  }

  public isProcessing(): boolean {
    return this.refcount > 0;
  }

  public getCapabilityInfo(): CapabilityInfo {
    return this.capabilityInfo;
  }

  public setMaxQualityTier(quality: QualityTier): void {
    this.maxQualityTier = quality;
  }

  public getMaxQualityTier(): QualityTier {
    return this.maxQualityTier;
  }

  public setModelPath(path: string): void {
    this.options = {...this.options, modelPath: path};
    this.pushOptionsUpdate();
  }

  private applyImageBitmap(bitmap: ImageBitmap, url: string): void {
    const workerSource: WorkerBackgroundSource = {type: 'image', media: bitmap, url};
    // Record the url without the bitmap so the options object remains serialisable.
    this.options = {...this.options, backgroundSource: {type: 'image', url}};
    this.pushOptionsUpdate(workerSource, [bitmap]);
  }

  /**
   * Sends the current options to the worker (or updates globalOptions directly
   * for the non-worker path).  An optional pre-built WorkerBackgroundSource with
   * its transferable ImageBitmap can be supplied for setBackgroundSource calls.
   */
  private pushOptionsUpdate(workerSource?: WorkerBackgroundSource, transferables: Transferable[] = []): void {
    if (!this.refcount) {
      return;
    }
    // in case of not HD we will always use more performant model
    if (this.options.quality !== 'hd' && this.options.quality !== 'fhd' && this.options.quality !== 'auto') {
      this.options.modelPath = SELFIE_SEGMENTER_MODEL_PATH;
      backgroundEffectsStore.getState().setIsHighQualityBlurEnabled(false);
    }

    const {options: workerOptions} = getWorkerOptions(this.options);
    const finalOptions: WorkerProcessVideoTrackOptions = workerSource
      ? {...workerOptions, backgroundSource: workerSource}
      : workerOptions;

    if (this.options.useWorker && this.worker) {
      this.worker.postMessage({name: 'options', options: finalOptions}, transferables);
    } else {
      updateSegmenterOptions(finalOptions);
    }
  }

  private async changeResolution(quality: QualityMode): Promise<QualityMode> {
    if (!this.inputTrack || quality === 'auto') {
      return quality;
    }

    const mediaConstraints = this.inputTrack.getConstraints();

    let newResolution: Resolution;
    let newQualityTier: QualityTier;

    if (quality === 'bypass') {
      newResolution = this.maxResolution;
      newQualityTier = quality;
    } else {
      const requestedResolution = TIER_DEFINITIONS[quality].resolution;

      if (this.maxResolution === null || resolutionIsGreaterThanOrEqualTo(this.maxResolution, requestedResolution)) {
        newResolution = requestedResolution;
        newQualityTier = quality;
      } else {
        newResolution = this.maxResolution;
        newQualityTier = this.maxQualityTier;
      }
    }

    mediaConstraints.width = {ideal: newResolution.width};
    mediaConstraints.height = {ideal: newResolution.height};

    try {
      await this.inputTrack.applyConstraints(mediaConstraints);
      return newQualityTier;
    } catch (error: unknown) {
      this.logger.warn('Failed to change resolution', error);
      return this.maxQualityTier;
    }
  }

  private enqueuePerformanceSample(sample: PerformanceSample, mode: Mode): void {
    this.qualitySampleQueue = this.qualitySampleQueue
      .then(() => this.onPerformanceSample(sample, mode))
      .catch((error: unknown) => {
        this.logger?.error?.('onPerformanceSample failed', {error});
      });
  }

  private async onPerformanceSample(sample: PerformanceSample, mode: Mode): Promise<void> {
    if (this.qualityController === null) {
      this.logger.warn('onPerformanceSample: qualityController is null');
      return;
    }

    const currentQualityTier = this.qualityController.getCurrentTier();
    const tier = this.qualityController.update(sample, mode);
    if (tier.tier === currentQualityTier) {
      return;
    }
    this.logger.log(`onPerformanceSample: qualityController.update from: ${currentQualityTier} to ${tier.tier}`);
    return this.setQuality(tier.tier);
  }
}

// ---------------------------------------------------------------------------
// Module-level pure helpers
// ---------------------------------------------------------------------------

const blurStrengthToBgBlur = (strength: number): number => Math.max(strength * BLUR_SIGMA_SCALE, 1);

const modeToRenderFlags = (
  mode: EffectMode,
  blurStrength: number,
  bgBlurRadius: number,
): Pick<ProcessVideoTrackOptions, 'enabled' | 'bgBlur' | 'bgBlurRadius'> => {
  switch (mode) {
    case 'blur':
      return {enabled: true, bgBlur: blurStrengthToBgBlur(blurStrength), bgBlurRadius};
    case 'virtual':
      return {enabled: true, bgBlur: 0, bgBlurRadius};
    case 'passthrough':
    default:
      return {enabled: false, bgBlur: 0, bgBlurRadius};
  }
};

const withoutBitmap = (options: ProcessVideoTrackOptions): ProcessVideoTrackOptions => {
  if (!(options.backgroundSource?.media instanceof ImageBitmap)) {
    return options;
  }
  return {
    ...options,
    backgroundSource: {type: options.backgroundSource.type, url: options.backgroundSource.url},
  };
};

const resolveOptions = async (options: ProcessVideoTrackOptions): Promise<ProcessVideoTrackOptions> => {
  const renderFlags = modeToRenderFlags(options.mode ?? 'blur', options.blurStrength, options.bgBlurRadius);
  const resolved = {...options, ...renderFlags};

  if (resolved.backgroundSource?.media instanceof HTMLImageElement) {
    const bitmap = await createImageBitmap(resolved.backgroundSource.media);
    resolved.backgroundSource = {
      type: resolved.backgroundSource.type,
      media: bitmap,
      url: resolved.backgroundSource.url,
    };
  }

  return resolved;
};

const getWorkerOptions = (
  options: ProcessVideoTrackOptions,
): {options: WorkerProcessVideoTrackOptions; transferables: Transferable[]} => {
  const transferables: Transferable[] = [];
  let workerBackgroundSource: WorkerBackgroundSource | null = null;

  if (options.backgroundSource) {
    const {type, media, url} = options.backgroundSource;
    workerBackgroundSource = {type, media: undefined, url};

    if (media instanceof ImageBitmap) {
      workerBackgroundSource.media = media;
      transferables.push(media);
    }
  }

  const workerOptions: WorkerProcessVideoTrackOptions = {
    wasmLoaderPath: options.wasmLoaderPath,
    wasmBinaryPath: options.wasmBinaryPath,
    modelPath: options.modelPath,
    useWorker: options.useWorker,
    mode: options.mode,
    blurStrength: options.blurStrength,
    enabled: options.enabled,
    quality: options.quality,
    borderSmooth: options.borderSmooth,
    smoothing: options.smoothing,
    smoothstepMin: options.smoothstepMin,
    smoothstepMax: options.smoothstepMax,
    bgBlur: options.bgBlur,
    bgBlurRadius: options.bgBlurRadius,
    enableFilters: options.enableFilters,
    blur: options.blur,
    brightness: options.brightness,
    contrast: options.contrast,
    gamma: options.gamma,
    backgroundSource: workerBackgroundSource,
  };

  return {options: workerOptions, transferables: transferables};
};
