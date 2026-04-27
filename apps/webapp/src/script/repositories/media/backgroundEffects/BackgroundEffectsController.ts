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

/**
 * Main controller for background effects processing pipeline.
 *
 * This class orchestrates the entire background effects system, managing:
 * - BackgroundEffectsRenderingPipeline selection (worker-webgl2, main-webgl2, canvas2d, passthrough)
 * - Frame processing and routing to appropriate pipeline
 * - Runtime configuration (mode, quality, blur strength, debug mode)
 * - Background source management (images and videos)
 * - Resource lifecycle (initialization, cleanup)
 *
 * The controller automatically selects the best available pipeline based on
 * browser capabilities and processes video frames through the selected pipeline
 * to produce an output MediaStreamTrack with effects applied.
 */
import {getLogger, Logger} from 'Util/logger';

import {
  type CapabilityInfo,
  type EffectMode,
  type Metrics,
  QualityMode,
  type QualityTier,
} from './backgroundEffectsWorkerTypes';
import {detectCapabilities} from './helper/capability';
import {defaultOpts, ImageBackgroundSource, ProcessVideoTrackOptions} from './pipe/options';
import {TrackProcessor} from './pipe/processor';
import {runSegmenter} from './pipe/segmenter';

export class BackgroundEffectsController {
  private readonly logger: Logger;

  private worker: Worker | null = null;
  private options: ProcessVideoTrackOptions = defaultOpts;

  private onMetrics: ((metrics: Metrics) => void) | null = null;
  private onModelChange: ((model: string) => void) | null = null;

  private capabilityInfo: CapabilityInfo = {
    offscreenCanvas: false,
    worker: false,
    webgl2: false,
    requestVideoFrameCallback: false,
  };
  private maxQualityTier: QualityTier = 'superhigh';

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

  public async start(
    inputTrack: MediaStreamTrack,
    options: ProcessVideoTrackOptions,
  ): Promise<{outputTrack: MediaStreamTrack; stop: () => void}> {
    this.refcount++;

    this.onMetrics = options.onMetrics;

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
    // let graph: Graph | null = null;

    const outputTrackStop = outputTrack.stop.bind(outputTrack);

    outputTrack.stop = () => {
      this.logger.info('start: outputTrack stop');
      outputTrackStop();
      inputTrack.stop();
      this.refcount--;
      if (!this.refcount) {
        this.unloadBackground();
        if (this.worker !== null) {
          this.worker.terminate();
          this.worker = null;
        }
      }
      // if (graph) {
      //   graph.remove();
      //   graph = null;
      // }
    };

    outputTrack.getCapabilities = () => trackCapabilities;
    outputTrack.getSettings = () => trackSettings;
    outputTrack.getConstraints = () => trackConstraints;
    inputTrack.addEventListener('ended', () => outputTrack.stop());

    if (this.options.useWorker) {
      if (this.worker === null) {
        this.worker = new Worker(/* webpackChunkName: "worker" */ new URL('./pipe/worker.ts', import.meta.url));
      }
      const {options: workerOptions, transferables} = this.getWorkerOptions(this.options);
      transferables.push(offscreen, readable);

      this.worker.postMessage(
        {name: 'runSegmenter', canvas: offscreen, readable, options: workerOptions},
        transferables,
      );

      this.worker.addEventListener('message', ({data}) => {
        const {name, stats} = data as {name: string; stats: Metrics};
        if (name === 'stats') {
          this.onMetrics(stats);
        }
      });
    } else {
      await runSegmenter(offscreen, readable, this.options, stats => this.onMetrics(stats));
    }

    return {
      outputTrack: outputTrack,
      stop: async () => await this.stop(),
    };
  }

  private unloadBackground() {}

  public stop(): void {}

  private getWorkerOptions(options: ProcessVideoTrackOptions) {
    const opts = {...options};
    const transferables: Transferable[] = [];
    if (opts.backgroundSource?.media) {
      const {type, media, url} = opts.backgroundSource;
      opts.backgroundSource = {type, media, url};
      transferables.push(media);
    } else {
      delete opts.backgroundSource;
    }
    if (options.backgroundSource) {
      options.backgroundSource.media = undefined;
    }
    return {options: opts, transferables};
  }

  /// --- interface
  public setBackgroundSource(source: ImageBackgroundSource): void {
    this.logger.info('setBackgroundSource', source);
  }

  public setMode(mode: EffectMode): void {
    this.logger.info('Background effects mode', mode);
  }

  public setBlurStrength(value: number): void {}

  setQuality(quality: QualityMode) {
    this.logger.info('setQuality', quality);
  }

  getQuality(): QualityMode {
    this.logger.info('getQuality');
    return 'auto';
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
}
