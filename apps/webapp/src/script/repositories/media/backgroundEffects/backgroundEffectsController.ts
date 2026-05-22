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

import {runCanvas2dSegmenter} from 'Repositories/media/backgroundEffects/pipe/canvas2dSegmenter';
import {BackgroundSource} from 'Repositories/media/VideoBackgroundEffects';
import {getLogger, Logger} from 'Util/logger';

import {type CapabilityInfo, type EffectMode, type Metrics, QualityMode} from './backgroundEffectsWorkerTypes';
import {choosePipeline, detectCapabilities} from './helper/capability';
import {defaultVideoTrackOptions} from './pipe/defaultVideoTrackOptions';
import {ProcessVideoTrackOptions, WorkerBackgroundSource, WorkerProcessVideoTrackOptions} from './pipe/options';
import {TrackProcessor} from './pipe/processor';
import {updateSegmenterOptions} from './pipe/segmenter';
import {runWebGlSegmenter} from './pipe/webGlSegmenter';

// Blur strength (0–1) maps to Gaussian sigma in pixel units for the shader.
// The shader's blur radius is 30 px, so a sigma in the ~10–20 px range gives
// visually useful blur.  Multiply by this factor to get from the 0–1 range.
const BLUR_SIGMA_SCALE = 15;
const STOP_ACK_TIMEOUT_MS = 250;

type WorkerMessage =
  | {name: 'stats'; stats: Metrics}
  | {name: 'rendererFallback'; modelPath: string}
  | {name: 'stopped'};

type ActivePipeline = {
  outputTrack: MediaStreamTrack;
  teardown: () => Promise<void>;
};

export class BackgroundEffectsController {
  private readonly logger: Logger;

  private worker: Worker | null = null;
  private options: ProcessVideoTrackOptions = defaultVideoTrackOptions;

  private readonly capabilityInfo: CapabilityInfo = {
    offscreenCanvas: false,
    worker: false,
    webgl2: false,
    requestVideoFrameCallback: false,
  };

  private activePipeline: ActivePipeline | null = null;

  /**
   * Creates a new background effects controller.
   *
   * Initializes the logger. All other components are initialized when start() is called.
   */
  constructor() {
    this.logger = getLogger('BackgroundEffectsController');
    this.capabilityInfo = detectCapabilities();
  }

  public async start(inputTrack: MediaStreamTrack, trackOptions: ProcessVideoTrackOptions): Promise<MediaStreamTrack> {
    if (this.activePipeline !== null) {
      this.logger.info('start: tearing down previous pipeline before starting a new one');
      await this.activePipeline.teardown();
    }

    const resolved = await resolveOptions(trackOptions);
    this.options = withoutBitmap(resolved);

    const trackCapabilities = inputTrack.getCapabilities();
    const trackSettings = inputTrack.getSettings();
    const trackConstraints = inputTrack.getConstraints();
    const {width, height, frameRate} = trackSettings;

    this.logger.info(`start: ${width}x${height} ${frameRate}fps`, {
      trackCapabilities,
      trackSettings,
      trackConstraints,
    });

    const {readable} = new TrackProcessor({track: inputTrack});

    const canvas = document.createElement('canvas');
    const outputTrack = canvas.captureStream(frameRate).getVideoTracks()[0];
    const offscreen = canvas.transferControlToOffscreen();

    const pipelineType = choosePipeline(this.capabilityInfo, resolved.useWorker);
    const useWorker = pipelineType === 'worker-webgl2';
    const useCanvas2d = pipelineType === 'canvas2d';
    this.logger.info(`start: pipeline=${pipelineType}, useWorker=${useWorker}, useCanvas2d=${useCanvas2d}`);

    const outputTrackStop = outputTrack.stop.bind(outputTrack);
    let onWorkerMessage: ({data}: MessageEvent<WorkerMessage>) => void = () => null;
    let stopMainSegmenter: (() => Promise<void>) | null = null;

    const onMetrics = (stats: Metrics) => {
      if (trackOptions.onMetrics) {
        trackOptions.onMetrics(stats);
      }
    };

    const onRendererFallback = (modelPath: string) => {
      this.options = {...this.options, modelPath};
      if (trackOptions.onRendererFallback) {
        trackOptions.onRendererFallback(modelPath);
      }
    };

    if (useWorker) {
      if (this.worker === null) {
        this.worker = new Worker(/* webpackChunkName: "worker" */ new URL('./pipe/worker.ts', import.meta.url));
      }
      const {options: workerOptions, transferables} = getWorkerOptions(resolved);

      transferables.push(offscreen, readable);

      this.worker.postMessage(
        {name: 'runSegmenter', pipeline: 'webgl2', canvas: offscreen, readable, options: workerOptions},
        transferables,
      );

      onWorkerMessage = ({data}: MessageEvent<WorkerMessage>) => {
        switch (data.name) {
          case 'stats':
            onMetrics(data.stats);
            break;

          case 'rendererFallback':
            onRendererFallback(data.modelPath);
            break;
        }
      };

      this.worker.addEventListener('message', onWorkerMessage);
    } else {
      const {options: workerOptions} = getWorkerOptions(resolved);
      stopMainSegmenter = useCanvas2d
        ? await runCanvas2dSegmenter(offscreen, readable, workerOptions, onMetrics, onRendererFallback)
        : await runWebGlSegmenter(offscreen, readable, workerOptions, onMetrics, onRendererFallback);
    }

    const teardown = async (): Promise<void> => {
      this.logger.info('start: tearing down pipeline');

      if (useWorker && this.worker !== null) {
        try {
          this.worker.postMessage({name: 'stop'});
          await waitForWorkerStopAck(this.worker, STOP_ACK_TIMEOUT_MS);
        } catch (error) {
          this.logger.warn('teardown: worker stop failed', error);
        }
        this.worker.removeEventListener('message', onWorkerMessage);
        this.worker.terminate();
        this.worker = null;
      } else if (stopMainSegmenter) {
        try {
          await stopMainSegmenter();
        } catch (error) {
          this.logger.warn('teardown: main-thread segmenter stop failed', error);
        }
      }

      this.activePipeline = null;
    };

    outputTrack.stop = () => {
      this.logger.info('start: outputTrack stop');
      outputTrackStop();
      void teardown();
    };

    outputTrack.getCapabilities = () => trackCapabilities;
    outputTrack.getSettings = () => trackSettings;
    outputTrack.getConstraints = () => trackConstraints;
    inputTrack.addEventListener('ended', () => outputTrack.stop());

    this.activePipeline = {outputTrack, teardown};

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

  public setQuality(quality: QualityMode): void {
    this.logger.info('setQuality', quality);
    this.options = {...this.options, quality};
    this.pushOptionsUpdate();
  }

  public getQuality(): QualityMode {
    return this.options.quality;
  }

  public isProcessing(): boolean {
    return this.activePipeline !== null;
  }

  public getCapabilityInfo(): CapabilityInfo {
    return this.capabilityInfo;
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
    if (this.activePipeline === null) {
      return;
    }

    const {options: workerOptions} = getWorkerOptions(this.options);
    const finalOptions: WorkerProcessVideoTrackOptions = workerSource
      ? {...workerOptions, backgroundSource: workerSource}
      : workerOptions;

    if (this.worker !== null) {
      this.worker.postMessage({name: 'options', options: finalOptions}, transferables);
    } else {
      updateSegmenterOptions(finalOptions);
    }
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

const waitForWorkerStopAck = (worker: Worker, timeoutMs: number): Promise<void> =>
  new Promise(resolve => {
    const timeoutId = window.setTimeout(() => {
      worker.removeEventListener('message', onMessage);
      resolve();
    }, timeoutMs);

    const onMessage = ({data}: MessageEvent<WorkerMessage>) => {
      if (data.name !== 'stopped') {
        return;
      }

      window.clearTimeout(timeoutId);
      worker.removeEventListener('message', onMessage);
      resolve();
    };

    worker.addEventListener('message', onMessage);
  });
