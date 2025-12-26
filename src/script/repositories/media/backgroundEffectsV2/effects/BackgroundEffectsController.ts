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

import {getLogger, Logger} from 'Util/Logger';

import {detectCapabilities, choosePipeline} from './capability';
import {VideoSource} from './VideoSource';

import {QualityController} from '../quality/QualityController';
import {WebGLRenderer} from '../renderer/WebGLRenderer';
import {Segmenter} from '../segmentation/segmenter';
import type {
  BackgroundSourceImage,
  BackgroundSourceVideoFrame,
  DebugMode,
  EffectMode,
  QualityMode,
  StartOptions,
  WorkerOptions,
  WorkerResponse,
} from '../types';

export class BackgroundEffectsController {
  private readonly logger: Logger;
  private worker: Worker | null = null;
  private renderer: WebGLRenderer | null = null;
  private segmenter: Segmenter | null = null;
  private qualityController: QualityController | null = null;
  private videoSource: VideoSource | null = null;
  private outputCanvas: HTMLCanvasElement | null = null;
  private outputTrack: MediaStreamTrack | null = null;
  private mode: EffectMode = 'blur';
  private debugMode: DebugMode = 'off';
  private blurStrength = 0.5;
  private quality: QualityMode = 'auto';
  private targetFps = 30;
  private segmentationModelPath = '/assets/mediapipe-models/selfie_segmenter.tflite';
  private backgroundSource: BackgroundSourceImage | BackgroundSourceVideoFrame | null = null;
  private pipeline: 'worker-webgl2' | 'main-webgl2' | 'canvas2d' | 'passthrough' = 'passthrough';
  private inFlight = false;
  private pendingFrame: ImageBitmap | null = null;
  private backgroundPumpCancel: (() => void) | null = null;
  private droppedFrames = 0;
  private mainFrameCount = 0;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private foregroundCanvas: HTMLCanvasElement | null = null;
  private foregroundCtx: CanvasRenderingContext2D | null = null;
  private canvasPassthroughLogged = false;

  constructor() {
    this.logger = getLogger('BackgroundEffectsController');
  }

  public async start(
    inputTrack: MediaStreamTrack,
    opts: StartOptions = {},
  ): Promise<{outputTrack: MediaStreamTrack; stop: () => void}> {
    this.mode = opts.mode ?? this.mode;
    this.debugMode = opts.debugMode ?? this.debugMode;
    this.blurStrength = opts.blurStrength ?? this.blurStrength;
    this.quality = opts.quality ?? this.quality;
    this.targetFps = opts.targetFps ?? this.targetFps;
    this.segmentationModelPath = opts.segmentationModelPath ?? this.segmentationModelPath;

    const cap = detectCapabilities();
    this.pipeline = choosePipeline(cap, opts.useWorker !== false);

    this.videoSource = new VideoSource(inputTrack);
    this.outputCanvas = document.createElement('canvas');

    const settings = inputTrack.getSettings();
    this.outputCanvas.width = settings.width ?? 640;
    this.outputCanvas.height = settings.height ?? 480;

    if (this.pipeline === 'worker-webgl2') {
      await this.initWorkerPipeline();
    } else if (this.pipeline === 'main-webgl2') {
      await this.initMainPipeline();
    } else if (this.pipeline === 'canvas2d') {
      await this.initCanvasPipeline();
    }

    await this.videoSource.start(async (timestamp, width, height) => {
      if (!this.outputCanvas) {
        return;
      }
      if (width === 0 || height === 0) {
        return;
      }
      if (this.outputCanvas.width !== width || this.outputCanvas.height !== height) {
        try {
          this.outputCanvas.width = width;
          this.outputCanvas.height = height;
        } catch (error) {
          this.logger.warn('Failed to resize output canvas', error);
        }
      }

      if (this.pipeline === 'worker-webgl2' && this.inFlight && this.pendingFrame) {
        return;
      }

      const bitmap = await createImageBitmap(this.videoSource!.element);
      this.handleFrame(bitmap, timestamp, width, height);
    });

    const captureStream = this.outputCanvas.captureStream(this.targetFps);
    this.outputTrack = captureStream.getVideoTracks()[0];

    inputTrack.addEventListener('ended', () => this.stop());

    if (opts.backgroundImage) {
      this.setBackgroundSource(opts.backgroundImage);
    }
    if (opts.backgroundVideo) {
      this.setBackgroundSource(opts.backgroundVideo);
    }

    return {
      outputTrack: this.outputTrack,
      stop: () => this.stop(),
    };
  }

  public setMode(mode: EffectMode): void {
    this.mode = mode;
    if (this.worker) {
      this.worker.postMessage({type: 'setMode', mode});
    }
  }

  public setBlurStrength(value: number): void {
    this.blurStrength = Math.max(0, Math.min(1, value));
    if (this.worker) {
      this.worker.postMessage({type: 'setBlurStrength', blurStrength: this.blurStrength});
    }
  }

  public setBackgroundSource(source: HTMLImageElement | HTMLVideoElement | ImageBitmap): void {
    if (source instanceof HTMLImageElement) {
      createImageBitmap(source)
        .then(bitmap => {
          if (this.worker) {
            this.worker.postMessage(
              {
                type: 'setBackgroundImage',
                image: bitmap,
                width: source.naturalWidth,
                height: source.naturalHeight,
              },
              [bitmap],
            );
          } else if (this.renderer) {
            this.backgroundSource?.bitmap?.close();
            this.backgroundSource = {type: 'image', bitmap, width: source.naturalWidth, height: source.naturalHeight};
            this.renderer.setBackground(bitmap, source.naturalWidth, source.naturalHeight);
          } else {
            bitmap.close();
          }
        })
        .catch(error => this.logger.warn('Failed to set background image', error));
      return;
    }

    if (source instanceof HTMLVideoElement) {
      this.startBackgroundVideoPump(source);
      return;
    }

    if (this.worker) {
      this.worker.postMessage(
        {
          type: 'setBackgroundImage',
          image: source,
          width: source.width,
          height: source.height,
        },
        [source],
      );
    } else if (this.renderer) {
      this.backgroundSource?.bitmap?.close();
      this.backgroundSource = {type: 'image', bitmap: source, width: source.width, height: source.height};
      this.renderer.setBackground(source, source.width, source.height);
    } else {
      source.close();
    }
  }

  public setDebugMode(mode: DebugMode): void {
    this.debugMode = mode;
    if (this.worker) {
      this.worker.postMessage({type: 'setDebugMode', debugMode: mode});
    }
  }

  public setQuality(mode: QualityMode): void {
    this.quality = mode;
    if (this.worker) {
      this.worker.postMessage({type: 'setQuality', quality: mode});
    }
  }

  public stop(): void {
    this.backgroundPumpCancel?.();
    this.backgroundPumpCancel = null;
    this.pendingFrame?.close();
    this.pendingFrame = null;
    this.backgroundSource?.bitmap?.close();
    this.backgroundSource = null;

    if (this.worker) {
      this.worker.postMessage({type: 'stop'});
      this.worker.terminate();
      this.worker = null;
    }

    this.renderer?.destroy();
    this.renderer = null;

    this.segmenter?.close();
    this.segmenter = null;

    this.videoSource?.stop();
    this.videoSource = null;

    this.outputTrack?.stop();
    this.outputTrack = null;

    this.outputCanvas = null;
    this.canvasCtx = null;
    this.foregroundCanvas = null;
    this.foregroundCtx = null;
  }

  private async initWorkerPipeline(): Promise<void> {
    if (!this.outputCanvas) {
      return;
    }

    const offscreen = this.outputCanvas.transferControlToOffscreen();
    this.worker = new Worker(new URL('../worker/bgfx.worker.ts', import.meta.url), {type: 'module'});

    const workerOptions: WorkerOptions = {
      mode: this.mode,
      debugMode: this.debugMode,
      quality: this.quality,
      blurStrength: this.blurStrength,
      segmentationModelPath: this.segmentationModelPath,
      targetFps: this.targetFps,
    };

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.type === 'frameProcessed') {
        this.inFlight = false;
        if (this.pendingFrame) {
          const next = this.pendingFrame;
          this.pendingFrame = null;
          this.sendFrameToWorker(next);
        }
      }
    };

    this.worker.postMessage(
      {
        type: 'init',
        canvas: offscreen,
        width: this.outputCanvas.width,
        height: this.outputCanvas.height,
        devicePixelRatio: window.devicePixelRatio,
        options: workerOptions,
      },
      [offscreen],
    );
  }

  private async initMainPipeline(): Promise<void> {
    if (!this.outputCanvas) {
      return;
    }

    this.renderer = new WebGLRenderer(this.outputCanvas, this.outputCanvas.width, this.outputCanvas.height);
    this.segmenter = new Segmenter(this.segmentationModelPath, 'GPU');
    this.qualityController = new QualityController(this.targetFps);
    try {
      await this.segmenter.init();
    } catch (error) {
      this.logger.warn('Segmentation init failed, falling back to passthrough', error);
      this.segmenter = null;
      this.pipeline = 'passthrough';
    }
  }

  private async initCanvasPipeline(): Promise<void> {
    if (!this.outputCanvas) {
      return;
    }
    const ctx = this.outputCanvas.getContext('2d');
    if (!ctx) {
      this.pipeline = 'passthrough';
      return;
    }
    this.canvasCtx = ctx;
    this.foregroundCanvas = document.createElement('canvas');
    this.foregroundCanvas.width = this.outputCanvas.width;
    this.foregroundCanvas.height = this.outputCanvas.height;
    this.foregroundCtx = this.foregroundCanvas.getContext('2d');
    // Canvas2D pipeline doesn't have WebGL2, so use CPU delegate
    this.segmenter = new Segmenter(this.segmentationModelPath, 'CPU');
    this.qualityController = new QualityController(this.targetFps);
    try {
      await this.segmenter.init();
    } catch (error) {
      this.logger.warn('Segmentation init failed, canvas2d will pass through', error);
      this.segmenter = null;
    }
  }

  private handleFrame(frame: ImageBitmap, timestamp: number, width: number, height: number): void {
    if (this.pipeline === 'worker-webgl2') {
      this.sendFrameToWorker(frame, timestamp, width, height);
      return;
    }

    if (this.pipeline === 'main-webgl2') {
      this.renderOnMain(frame, timestamp, width, height).catch(error => this.logger.warn('Main render failed', error));
      return;
    }

    if (this.pipeline === 'canvas2d') {
      this.renderOnCanvas2D(frame, width, height);
      return;
    }

    this.renderPassthrough(frame, width, height);
  }

  private sendFrameToWorker(frame: ImageBitmap, timestamp?: number, width?: number, height?: number): void {
    if (!this.worker) {
      frame.close();
      return;
    }

    if (this.inFlight) {
      this.droppedFrames += 1;
      this.pendingFrame?.close();
      this.pendingFrame = frame;
      this.worker.postMessage({type: 'setDroppedFrames', droppedFrames: this.droppedFrames});
      return;
    }

    this.inFlight = true;
    this.worker.postMessage(
      {
        type: 'frame',
        frame,
        timestamp: timestamp ?? performance.now() / 1000,
        width: width ?? frame.width,
        height: height ?? frame.height,
      },
      [frame],
    );
  }

  private async renderOnMain(frame: ImageBitmap, timestamp: number, width: number, height: number): Promise<void> {
    if (!this.renderer) {
      frame.close();
      return;
    }

    if (!this.segmenter || !this.qualityController) {
      this.renderer.configure(width, height, this.resolveMainQuality(), this.mode, this.debugMode, this.blurStrength);
      this.renderer.render(frame, null);
      frame.close();
      return;
    }

    const qualityTier = this.resolveMainQuality();
    this.renderer.configure(width, height, qualityTier, this.mode, this.debugMode, this.blurStrength);

    let mask: ImageBitmap | null = null;
    let segmentationMs = 0;
    if (!qualityTier.bypass && qualityTier.segmentationCadence > 0) {
      this.mainFrameCount += 1;
      if (this.mainFrameCount % qualityTier.segmentationCadence === 0) {
        this.segmenter.configure(qualityTier.segmentationWidth, qualityTier.segmentationHeight);
        const segStart = performance.now();
        const result = await this.segmenter.segment(frame, timestamp * 1000);
        segmentationMs = performance.now() - segStart;
        mask = result.mask;
      }
    }

    if (this.backgroundSource) {
      this.renderer.setBackground(
        this.backgroundSource.bitmap,
        this.backgroundSource.width,
        this.backgroundSource.height,
      );
    }

    const gpuStart = performance.now();
    this.renderer.render(frame, mask);
    const gpuMs = performance.now() - gpuStart;

    frame.close();
    mask?.close();

    if (this.quality === 'auto' && this.qualityController) {
      this.qualityController.update({totalMs: segmentationMs + gpuMs, segmentationMs, gpuMs});
    }
  }

  private renderOnCanvas2D(frame: ImageBitmap, width: number, height: number): void {
    if (!this.outputCanvas || !this.canvasCtx) {
      frame.close();
      return;
    }
    const ctx = this.canvasCtx;
    this.foregroundCanvas!.width = width;
    this.foregroundCanvas!.height = height;
    ctx.clearRect(0, 0, width, height);

    if (this.mode === 'passthrough' || !this.segmenter || !this.qualityController) {
      if (!this.segmenter && !this.canvasPassthroughLogged) {
        this.logger.warn('Canvas2D pipeline running without segmenter; output will be passthrough');
        this.canvasPassthroughLogged = true;
      }
      ctx.drawImage(frame, 0, 0, width, height);
      frame.close();
      return;
    }

    const qualityTier = this.resolveMainQuality();
    this.mainFrameCount += 1;

    const renderMask = async () => {
      if (qualityTier.segmentationCadence > 0 && this.mainFrameCount % qualityTier.segmentationCadence === 0) {
        this.segmenter!.configure(qualityTier.segmentationWidth, qualityTier.segmentationHeight);
        return this.segmenter!.segment(frame, performance.now());
      }
      return {mask: null, width: 0, height: 0, durationMs: 0};
    };

    renderMask().then(result => {
      ctx.filter = 'blur(8px)';
      ctx.drawImage(frame, 0, 0, width, height);
      ctx.filter = 'none';

      if (result.mask && this.foregroundCtx) {
        this.foregroundCtx.clearRect(0, 0, width, height);
        this.foregroundCtx.drawImage(frame, 0, 0, width, height);
        this.foregroundCtx.globalCompositeOperation = 'destination-in';
        this.foregroundCtx.drawImage(result.mask, 0, 0, width, height);
        this.foregroundCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.foregroundCanvas!, 0, 0, width, height);
        result.mask.close();
      } else {
        ctx.drawImage(frame, 0, 0, width, height);
      }

      frame.close();
    });
  }

  private renderPassthrough(frame: ImageBitmap, width: number, height: number): void {
    if (!this.outputCanvas) {
      frame.close();
      return;
    }
    const ctx = this.outputCanvas.getContext('2d');
    if (!ctx) {
      frame.close();
      return;
    }
    ctx.drawImage(frame, 0, 0, width, height);
    frame.close();
  }

  private resolveMainQuality(): ReturnType<QualityController['getTier']> {
    if (!this.qualityController) {
      return {
        tier: 'D',
        segmentationWidth: 0,
        segmentationHeight: 0,
        segmentationCadence: 0,
        maskRefineScale: 1,
        blurDownsampleScale: 1,
        blurRadius: 0,
        bilateralRadius: 0,
        bilateralSpatialSigma: 0,
        bilateralRangeSigma: 0,
        temporalAlpha: 0,
        bypass: true,
      };
    }

    if (this.quality !== 'auto') {
      this.qualityController.setTier(this.quality);
    }
    return this.qualityController.getTier();
  }

  private startBackgroundVideoPump(video: HTMLVideoElement): void {
    this.backgroundPumpCancel?.();

    let lastTimestamp = 0;
    const targetInterval = 1000 / 15;
    let active = true;
    let rVFCHandle: number | null = null;
    let rafHandle: number | null = null;

    const pump = async (now: number) => {
      if (!active) {
        return;
      }
      if (now - lastTimestamp < targetInterval) {
        schedule();
        return;
      }
      lastTimestamp = now;

      try {
        const bitmap = await createImageBitmap(video);
        if (this.worker) {
          this.worker.postMessage(
            {
              type: 'setBackgroundVideo',
              video: bitmap,
              width: video.videoWidth,
              height: video.videoHeight,
            },
            [bitmap],
          );
        } else if (this.renderer) {
          this.backgroundSource?.bitmap?.close();
          this.backgroundSource = {type: 'video', bitmap, width: video.videoWidth, height: video.videoHeight};
          this.renderer.setBackground(bitmap, video.videoWidth, video.videoHeight);
        } else {
          bitmap.close();
        }
      } catch (error) {
        this.logger.warn('Failed to capture background video frame', error);
      }

      schedule();
    };

    const schedule = () => {
      if ('requestVideoFrameCallback' in video) {
        rVFCHandle = (video as any).requestVideoFrameCallback((now: number) => pump(now));
      } else {
        rafHandle = window.requestAnimationFrame(pump);
      }
    };

    schedule();
    this.backgroundPumpCancel = () => {
      active = false;
      if (rVFCHandle !== null && 'cancelVideoFrameCallback' in video) {
        (video as any).cancelVideoFrameCallback(rVFCHandle);
      }
      if (rafHandle !== null) {
        window.cancelAnimationFrame(rafHandle);
      }
      this.backgroundSource?.bitmap?.close();
      this.backgroundSource = null;
    };
  }
}
