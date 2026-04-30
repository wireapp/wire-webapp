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

import {BackgroundSource} from 'Repositories/media/VideoBackgroundEffects';
import {getLogger, Logger} from 'Util/logger';

import {
  type CapabilityInfo,
  type EffectMode,
  type Metrics,
  QualityMode,
  type QualityTier,
} from './backgroundEffectsWorkerTypes';
import {detectCapabilities} from './helper/capability';
import {
  defaultOpts,
  ProcessVideoTrackOptions,
  WorkerBackgroundSource,
  WorkerProcessVideoTrackOptions,
} from './pipe/options';
import {TrackProcessor} from './pipe/processor';
import {runSegmenter} from './pipe/segmenter';

export class BackgroundEffectsController {
  private readonly logger: Logger;

  private worker: Worker | null = null;
  private options: ProcessVideoTrackOptions = defaultOpts;

  private onMetrics: ((metrics: Metrics) => void) | null = null;
  private onModelChange: ((model: string) => void) | null = null;

  private readonly capabilityInfo: CapabilityInfo = {
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

      console.log('###### workerOptions', workerOptions, transferables);

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
      console.log('### hhhhhworkerOptions');
      const {options: workerOptions} = this.getWorkerOptions(this.options);
      await runSegmenter(offscreen, readable, workerOptions, stats => this.onMetrics(stats));
    }

    return {
      outputTrack: outputTrack,
      stop: async () => await this.stop(),
    };
  }

  private unloadBackground() {}

  public stop(): void {}

  private getWorkerOptions(options: ProcessVideoTrackOptions): {
    options: WorkerProcessVideoTrackOptions;
    transferables: Transferable[];
  } {
    const {onMetrics, onModelChange, backgroundSource, ...rest} = options;

    const transferables: Transferable[] = [];

    let workerBackgroundSource: WorkerBackgroundSource | null = null;

    // Copy all sources
    if (backgroundSource) {
      const {type, media, url} = backgroundSource;

      workerBackgroundSource = {
        type,
        media: null, // we remove media
        url,
      };

      // Only push when the media is truly transferable and this is only the case for ImageBitmap
      if (media instanceof ImageBitmap) {
        workerBackgroundSource.media = media;
        transferables.push(media);
      }
    }

    console.log('###### workerBackgroundSource', workerBackgroundSource);

    return {
      options: {
        ...rest,
        backgroundSource: workerBackgroundSource,
      },
      transferables,
    };
  }

  public setBackgroundSource(source: BackgroundSource): void {
    // if (source instanceof HTMLImageElement) {
    //   createImageBitmap(source)
    //     .then(bitmap => {
    //
    //       bitmap.
    //     } else if (newSource.type === 'image') {
    //
    //     const {media, url} = newSource as {media: ImageBitmap; url: string};
    //       const newSource = BackgroundSource {
    //       type: 'image';
    //       media: bitmap;
    //       url: '----';
    //     }
    //
    //
    //       if (!this.pipelineImpl) {
    //         bitmap.close();
    //         return;
    //       }
    //
    //
    //       this.pipelineImpl.setBackgroundImage(bitmap, source.naturalWidth, source.naturalHeight);
    //     })
    //     .catch((error: unknown) => this.logger.warn('Failed to set background image', error));
    //   return;
    // }
    //
    // if (!this.pipelineImpl) {
    //   source.close();
    //   return;
    // }
    // this.pipelineImpl.setBackgroundImage(source, source.width, source.height);
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
