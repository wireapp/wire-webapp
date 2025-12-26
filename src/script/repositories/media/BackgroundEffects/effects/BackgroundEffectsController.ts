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
 * - Pipeline selection (worker-webgl2, main-webgl2, canvas2d, passthrough)
 * - Frame processing and routing to appropriate pipeline
 * - Runtime configuration (mode, quality, blur strength, debug mode)
 * - Background source management (images and videos)
 * - Resource lifecycle (initialization, cleanup)
 *
 * The controller automatically selects the best available pipeline based on
 * browser capabilities and processes video frames through the selected pipeline
 * to produce an output MediaStreamTrack with effects applied.
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
  Metrics,
  Mode,
  PipelineType,
  QualityMode,
  StartOptions,
  WorkerOptions,
  WorkerResponse,
} from '../types';

/**
 * Main controller for background effects processing.
 *
 * This class manages the complete background effects pipeline, from input
 * MediaStreamTrack to output MediaStreamTrack with effects applied. It:
 *
 * 1. **Detects capabilities** and selects optimal pipeline
 * 2. **Initializes components** (renderer, segmenter, quality controller)
 * 3. **Processes frames** through the selected pipeline
 * 4. **Manages resources** and handles cleanup
 * 5. **Provides runtime controls** for mode, quality, and effects
 *
 * Pipeline selection priority:
 * - worker-webgl2: Best performance (background thread processing)
 * - main-webgl2: High quality (GPU-accelerated, main thread)
 * - canvas2d: Fallback (CPU-based, widely supported)
 * - passthrough: Last resort (no processing)
 */
export class BackgroundEffectsController {
  /** Logger instance for debugging and warnings. */
  private readonly logger: Logger;
  /** Whether running in development mode (enables additional logging). */
  private readonly isDev = process.env.NODE_ENV !== 'production';
  /** Web Worker instance for worker-webgl2 pipeline. */
  private worker: Worker | null = null;
  /** WebGL renderer instance for main-webgl2 pipeline. */
  private renderer: WebGLRenderer | null = null;
  /** ML segmenter instance for person/background separation. */
  private segmenter: Segmenter | null = null;
  /** Quality controller for adaptive performance tuning. */
  private qualityController: QualityController | null = null;
  /** Video source wrapper for frame extraction from input track. */
  private videoSource: VideoSource | null = null;
  /** Output canvas for rendering processed frames. */
  private outputCanvas: HTMLCanvasElement | null = null;
  /** Output MediaStreamTrack from canvas.captureStream(). */
  private outputTrack: MediaStreamTrack | null = null;
  /** Current effect mode ('blur', 'virtual', or 'passthrough'). */
  private mode: EffectMode = 'blur';
  /** Current debug visualization mode. */
  private debugMode: DebugMode = 'off';
  /** Blur strength (0-1) for blur effect mode. */
  private blurStrength = 0.5;
  /** Quality mode ('auto' for adaptive, or fixed tier 'A'/'B'/'C'/'D'). */
  private quality: QualityMode = 'auto';
  /** Target frames per second for adaptive quality control. */
  private targetFps = 30;
  /** Path to MediaPipe segmentation model file. */
  private segmentationModelPath = '/assets/mediapipe-models/selfie_segmenter_landscape.tflite';
  /** Background image/video source for virtual background mode. */
  private backgroundSource: BackgroundSourceImage | BackgroundSourceVideoFrame | null = null;
  /** Selected rendering pipeline. */
  private pipeline: PipelineType = 'passthrough';
  /** Flag indicating if a frame is currently being processed by worker. */
  private inFlight = false;
  /** Pending frame waiting to be sent to worker (backpressure control). */
  private pendingFrame: ImageBitmap | null = null;
  /** Cancel function for background video pump (stops video frame extraction). */
  private backgroundPumpCancel: (() => void) | null = null;
  /** Counter for dropped frames (worker pipeline backpressure). */
  private droppedFrames = 0;
  /** Frame counter for segmentation cadence (main and canvas2d pipelines). */
  private mainFrameCount = 0;
  /** Monotonic token to prevent out-of-order Canvas2D renders. */
  private canvasFrameToken = 0;
  /** Canvas2D rendering context for canvas2d pipeline. */
  private canvasCtx: CanvasRenderingContext2D | null = null;
  /** Foreground canvas for Canvas2D compositing. */
  private foregroundCanvas: HTMLCanvasElement | null = null;
  /** Foreground canvas 2D context. */
  private foregroundCtx: CanvasRenderingContext2D | null = null;
  /** Flag to prevent duplicate passthrough warnings in canvas2d pipeline. */
  private canvasPassthroughLogged = false;
  /** Last quality tier for main pipeline (for logging tier changes). */
  private lastMainTier: 'A' | 'B' | 'C' | 'D' | null = null;
  /** Last quality tier for worker pipeline (for logging tier changes). */
  private lastWorkerTier: 'A' | 'B' | 'C' | 'D' | null = null;
  /** Optional metrics callback for demo/telemetry use. */
  private onMetrics: ((metrics: Metrics) => void) | null = null;
  /** Recent samples for main-thread metrics averaging. */
  private readonly metricsSamples: {totalMs: number; segmentationMs: number; gpuMs: number}[] = [];
  /** Max samples to keep for rolling averages. */
  private readonly metricsMaxSamples = 30;

  /**
   * Creates a new background effects controller.
   *
   * Initializes the logger. All other components are initialized when start() is called.
   */
  constructor() {
    this.logger = getLogger('BackgroundEffectsController');
  }

  /**
   * Starts the background effects pipeline.
   *
   * This method:
   * 1. Applies configuration options
   * 2. Detects browser capabilities and selects optimal pipeline
   * 3. Initializes video source and output canvas
   * 4. Initializes the selected pipeline (worker/main/canvas2d)
   * 5. Starts frame processing loop
   * 6. Creates output MediaStreamTrack from canvas
   * 7. Sets up background sources if provided
   *
   * The pipeline processes frames from the input track and outputs a processed
   * track via canvas.captureStream(). The output track can be used with
   * RTCPeerConnection or other MediaStream APIs.
   *
   * @param inputTrack - Input video track (e.g., from getUserMedia).
   * @param opts - Configuration options (all optional with defaults).
   * @returns Promise resolving to output track and stop function.
   */
  public async start(
    inputTrack: MediaStreamTrack,
    opts: StartOptions = {},
  ): Promise<{outputTrack: MediaStreamTrack; stop: () => void}> {
    // Apply configuration options (use defaults if not provided)
    this.mode = opts.mode ?? this.mode;
    this.debugMode = opts.debugMode ?? this.debugMode;
    this.blurStrength = opts.blurStrength ?? this.blurStrength;
    this.quality = opts.quality ?? this.quality;
    this.targetFps = opts.targetFps ?? this.targetFps;
    this.segmentationModelPath = opts.segmentationModelPath ?? this.segmentationModelPath;
    this.onMetrics = opts.onMetrics ?? null;

    // Detect capabilities and select optimal pipeline
    const cap = detectCapabilities();
    const chosenPipeline = choosePipeline(cap, opts.useWorker !== false);
    this.pipeline = opts.pipelineOverride ?? chosenPipeline;
    if (this.isDev) {
      this.logger.info('Background effects capabilities', cap);
      this.logger.info('Background effects pipeline', {
        chosen: chosenPipeline,
        override: opts.pipelineOverride ?? null,
        active: this.pipeline,
      });
    }

    // Initialize video source for frame extraction
    this.videoSource = new VideoSource(inputTrack);
    // Create output canvas for rendering
    this.outputCanvas = document.createElement('canvas');

    // Set canvas dimensions from input track settings
    const settings = inputTrack.getSettings();
    this.outputCanvas.width = settings.width ?? 640;
    this.outputCanvas.height = settings.height ?? 480;

    // Initialize selected pipeline
    if (this.pipeline === 'worker-webgl2') {
      await this.initWorkerPipeline();
    } else if (this.pipeline === 'main-webgl2') {
      await this.initMainPipeline();
    } else if (this.pipeline === 'canvas2d') {
      await this.initCanvasPipeline();
    }
    // Start frame processing loop
    await this.videoSource.start(async (timestamp, width, height) => {
      if (!this.outputCanvas) {
        return;
      }
      // Skip frames with invalid dimensions
      if (width === 0 || height === 0) {
        return;
      }
      // Resize canvas if dimensions changed
      if (this.outputCanvas.width !== width || this.outputCanvas.height !== height) {
        try {
          this.outputCanvas.width = width;
          this.outputCanvas.height = height;
        } catch (error) {
          this.logger.warn('Failed to resize output canvas', error);
        }
      }

      // Worker pipeline backpressure: skip if frame already in flight and pending frame exists
      if (this.pipeline === 'worker-webgl2' && this.inFlight && this.pendingFrame) {
        return;
      }

      // Extract frame from video element and process
      const bitmap = await createImageBitmap(this.videoSource!.element);
      this.handleFrame(bitmap, timestamp, width, height);
    });

    // Create output MediaStreamTrack from canvas
    const captureStream = this.outputCanvas.captureStream(this.targetFps);
    this.outputTrack = captureStream.getVideoTracks()[0];

    // Stop pipeline when input track ends
    inputTrack.addEventListener('ended', () => this.stop());

    // Set background sources if provided
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

  /**
   * Sets the effect mode.
   *
   * Changes the processing mode at runtime. Updates worker if using worker pipeline.
   *
   * @param mode - Effect mode ('blur', 'virtual', or 'passthrough').
   */
  public setMode(mode: EffectMode): void {
    this.mode = mode;
    if (this.isDev) {
      this.logger.info('Background effects mode', mode);
    }
    if (this.worker) {
      this.worker.postMessage({type: 'setMode', mode});
    }
  }

  /**
   * Sets the blur strength for blur effect mode.
   *
   * Clamps value to valid range [0, 1]. Updates worker if using worker pipeline.
   *
   * @param value - Blur strength (0 = no blur, 1 = maximum blur).
   */
  public setBlurStrength(value: number): void {
    this.blurStrength = Math.max(0, Math.min(1, value));
    if (this.worker) {
      this.worker.postMessage({type: 'setBlurStrength', blurStrength: this.blurStrength});
    }
  }

  /**
   * Sets the background source for virtual background mode.
   *
   * Supports three source types:
   * - HTMLImageElement: Static image (converted to ImageBitmap)
   * - HTMLVideoElement: Video (pumped at ~15fps, converted to ImageBitmap frames)
   * - ImageBitmap: Direct bitmap (transferred to worker if using worker pipeline)
   *
   * For worker pipeline, the bitmap is transferred (not cloned) for performance.
   * For main pipeline, the bitmap is stored and passed to renderer.
   *
   * @param source - Background image, video element, or ImageBitmap.
   */
  public setBackgroundSource(source: HTMLImageElement | HTMLVideoElement | ImageBitmap): void {
    if (!(source instanceof HTMLVideoElement)) {
      this.backgroundPumpCancel?.();
      this.backgroundPumpCancel = null;
    }
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

  /**
   * Sets the debug visualization mode.
   *
   * Updates worker if using worker pipeline. Debug modes provide visualization
   * tools for inspecting segmentation masks.
   *
   * @param mode - Debug mode ('off', 'maskOverlay', 'maskOnly', or 'edgeOnly').
   */
  public setDebugMode(mode: DebugMode): void {
    this.debugMode = mode;
    if (this.worker) {
      this.worker.postMessage({type: 'setDebugMode', debugMode: mode});
    }
  }

  /**
   * Sets the quality mode.
   *
   * Changes quality mode at runtime. 'auto' enables adaptive quality based on
   * performance metrics, while fixed tiers ('A'/'B'/'C'/'D') use constant quality.
   * Updates worker if using worker pipeline.
   *
   * @param mode - Quality mode ('auto' or fixed tier 'A'/'B'/'C'/'D').
   */
  public setQuality(mode: QualityMode): void {
    this.quality = mode;
    if (this.isDev) {
      this.logger.info('Background effects quality mode', mode);
    }
    if (this.worker) {
      this.worker.postMessage({type: 'setQuality', quality: mode});
    }
  }

  /**
   * Stops the background effects pipeline and cleans up all resources.
   *
   * This method:
   * 1. Stops background video pump if active
   * 2. Closes pending frames and background sources
   * 3. Terminates worker if using worker pipeline
   * 4. Destroys renderer and segmenter
   * 5. Stops video source and output track
   * 6. Clears all references
   *
   * Should be called when the pipeline is no longer needed to free all resources
   * and prevent memory leaks.
   */
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
    this.onMetrics = null;
    this.metricsSamples.length = 0;
  }

  /**
   * Initializes the worker-based WebGL2 pipeline.
   *
   * Transfers OffscreenCanvas control to a Web Worker and initializes the worker
   * with renderer, segmenter, and quality controller. The worker processes frames
   * in a background thread to avoid blocking the main thread.
   *
   * Sets up message handlers for:
   * - Metrics: Performance metrics from worker
   * - Segmenter errors: Non-fatal errors (worker continues in bypass mode)
   * - Frame processed: Backpressure control (allows next frame to be sent)
   */
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
      if (event.data.type === 'metrics') {
        this.maybeLogWorkerTierChange(event.data.metrics.tier);
        this.onMetrics?.(event.data.metrics);
      }
      if (event.data.type === 'segmenterError' && this.isDev) {
        this.logger.warn('Worker segmenter init failed', event.data.error);
      }
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

  /**
   * Initializes the main-thread WebGL2 pipeline.
   *
   * Creates WebGL renderer, segmenter (GPU-accelerated), and quality controller
   * on the main thread. Falls back to passthrough if segmenter initialization fails.
   */
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

  /**
   * Initializes the Canvas2D fallback pipeline.
   *
   * Creates Canvas2D rendering contexts and segmenter (CPU-accelerated, since
   * Canvas2D pipeline doesn't have WebGL2). Uses basic blur/filtering and compositing
   * to honor effect mode, debug modes, and blur strength with lower visual quality.
   * Falls back to passthrough if segmenter initialization fails.
   */
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

  /**
   * Routes a frame to the appropriate pipeline for processing.
   *
   * Dispatches the frame to the selected pipeline:
   * - worker-webgl2: Sends to worker via postMessage
   * - main-webgl2: Renders on main thread
   * - canvas2d: Renders using Canvas2D API
   * - passthrough: Passes through without processing
   *
   * @param frame - Video frame as ImageBitmap.
   * @param timestamp - Frame timestamp in seconds.
   * @param width - Frame width in pixels.
   * @param height - Frame height in pixels.
   */
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

  /**
   * Sends a frame to the worker for processing.
   *
   * Implements backpressure control: if a frame is already in flight, stores
   * the new frame as pending and increments dropped frame counter. The pending
   * frame is sent when the worker signals frameProcessed.
   *
   * The frame is transferred (not cloned) for performance.
   *
   * @param frame - Video frame as ImageBitmap (will be transferred).
   * @param timestamp - Optional frame timestamp (defaults to current time).
   * @param width - Optional frame width (defaults to frame.width).
   * @param height - Optional frame height (defaults to frame.height).
   */
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

  /**
   * Renders a frame on the main thread using WebGL2.
   *
   * Processing steps:
   * 1. Resolves quality tier (adaptive or fixed)
   * 2. Runs segmentation if cadence allows
   * 3. Sets background source if available
   * 4. Renders frame with effects
   * 5. Updates quality controller metrics (adaptive mode)
   *
   * @param frame - Video frame as ImageBitmap.
   * @param timestamp - Frame timestamp in seconds.
   * @param width - Frame width in pixels.
   * @param height - Frame height in pixels.
   */
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
      const updatedTier = this.qualityController.update(
        {totalMs: segmentationMs + gpuMs, segmentationMs, gpuMs},
        this.getQualityMode(),
      );
      this.maybeLogMainTierChange(updatedTier.tier);
    }
    this.updateMainMetrics(segmentationMs + gpuMs, segmentationMs, gpuMs, qualityTier.tier);
  }

  private updateMainMetrics(totalMs: number, segmentationMs: number, gpuMs: number, tier: 'A' | 'B' | 'C' | 'D') {
    if (!this.onMetrics) {
      return;
    }
    this.metricsSamples.push({totalMs, segmentationMs, gpuMs});
    if (this.metricsSamples.length > this.metricsMaxSamples) {
      this.metricsSamples.shift();
    }
    const totals = this.metricsSamples.reduce(
      (acc, sample) => {
        acc.totalMs += sample.totalMs;
        acc.segmentationMs += sample.segmentationMs;
        acc.gpuMs += sample.gpuMs;
        return acc;
      },
      {totalMs: 0, segmentationMs: 0, gpuMs: 0},
    );
    const count = this.metricsSamples.length || 1;
    const metrics: Metrics = {
      avgTotalMs: totals.totalMs / count,
      avgSegmentationMs: totals.segmentationMs / count,
      avgGpuMs: totals.gpuMs / count,
      droppedFrames: this.droppedFrames,
      tier,
    };
    this.onMetrics(metrics);
  }

  /**
   * Renders a frame using Canvas2D API (fallback pipeline).
   *
   * Uses basic Canvas2D operations:
   * - Blur filter for background blur (honors blurStrength)
   * - Background image compositing for virtual mode
   * - Debug mode visualization using the mask
   * - Global composite operations for mask compositing
   * - Async segmentation (doesn't block rendering)
   *
   * This pipeline has lower quality than WebGL2 but is widely supported
   * and doesn't require WebGL2.
   *
   * @param frame - Video frame as ImageBitmap.
   * @param width - Frame width in pixels.
   * @param height - Frame height in pixels.
   */
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
    const token = ++this.canvasFrameToken;

    const renderMask = async () => {
      if (qualityTier.segmentationCadence > 0 && this.mainFrameCount % qualityTier.segmentationCadence === 0) {
        this.segmenter!.configure(qualityTier.segmentationWidth, qualityTier.segmentationHeight);
        return this.segmenter!.segment(frame, performance.now());
      }
      return {mask: null, width: 0, height: 0, durationMs: 0};
    };

    renderMask().then(result => {
      if (token !== this.canvasFrameToken) {
        result.mask?.close();
        frame.close();
        return;
      }
      const mask = result.mask;

      if (this.debugMode !== 'off' && mask) {
        ctx.clearRect(0, 0, width, height);
        if (this.debugMode === 'maskOnly') {
          ctx.drawImage(mask, 0, 0, width, height);
        } else if (this.debugMode === 'maskOverlay') {
          ctx.drawImage(frame, 0, 0, width, height);
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#00ff00';
          ctx.globalCompositeOperation = 'source-atop';
          ctx.drawImage(mask, 0, 0, width, height);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        } else if (this.debugMode === 'edgeOnly') {
          ctx.drawImage(mask, 0, 0, width, height);
        }
        mask.close();
        frame.close();
        return;
      }

      ctx.clearRect(0, 0, width, height);
      const blurPx = Math.round(2 + this.blurStrength * 10);
      if (this.mode === 'virtual' && this.backgroundSource) {
        ctx.drawImage(
          this.backgroundSource.bitmap,
          0,
          0,
          this.backgroundSource.width,
          this.backgroundSource.height,
          0,
          0,
          width,
          height,
        );
      } else {
        ctx.filter = `blur(${blurPx}px)`;
        ctx.drawImage(frame, 0, 0, width, height);
        ctx.filter = 'none';
      }

      if (mask && this.foregroundCtx) {
        this.foregroundCtx.clearRect(0, 0, width, height);
        this.foregroundCtx.drawImage(frame, 0, 0, width, height);
        this.foregroundCtx.globalCompositeOperation = 'destination-in';
        this.foregroundCtx.drawImage(mask, 0, 0, width, height);
        this.foregroundCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.foregroundCanvas!, 0, 0, width, height);
        mask.close();
      } else {
        ctx.drawImage(frame, 0, 0, width, height);
      }

      frame.close();
    });
  }

  /**
   * Renders frame without processing (passthrough mode).
   *
   * Simply draws the input frame to the output canvas without any effects.
   * Used when no processing pipeline is available or when explicitly set to passthrough.
   *
   * @param frame - Video frame as ImageBitmap.
   * @param width - Frame width in pixels.
   * @param height - Frame height in pixels.
   */
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

  /**
   * Resolves quality tier parameters for main-thread pipelines.
   *
   * Returns quality tier based on:
   * - Fixed quality mode: Uses the specified tier
   * - Auto quality mode: Gets current adaptive tier from quality controller
   * - Fallback: Returns bypass tier (D) if quality controller unavailable
   *
   * @returns Quality tier parameters for rendering configuration.
   */
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
        softLow: 0.3,
        softHigh: 0.65,
        matteLow: 0.45,
        matteHigh: 0.6,
        matteHysteresis: 0.04,
        temporalAlpha: 0,
        bypass: true,
      };
    }

    if (this.quality !== 'auto') {
      this.qualityController.setTier(this.quality);
    }
    return this.qualityController.getTier(this.getQualityMode());
  }

  /**
   * Converts effect mode to quality mode.
   *
   * Quality controller uses 'blur' or 'virtual' modes, while effect mode
   * can also be 'passthrough' (which maps to 'blur' for quality purposes).
   *
   * @returns Quality mode ('blur' or 'virtual').
   */
  private getQualityMode(): Mode {
    return this.mode === 'virtual' ? 'virtual' : 'blur';
  }

  /**
   * Logs quality tier changes for main pipeline (development only).
   *
   * @param tier - New quality tier.
   */
  private maybeLogMainTierChange(tier: 'A' | 'B' | 'C' | 'D'): void {
    if (!this.isDev) {
      return;
    }
    if (this.lastMainTier !== tier) {
      this.logger.info('Main pipeline quality tier change', {from: this.lastMainTier, to: tier});
      this.lastMainTier = tier;
    }
  }

  /**
   * Logs quality tier changes for worker pipeline (development only).
   *
   * @param tier - New quality tier.
   */
  private maybeLogWorkerTierChange(tier: 'A' | 'B' | 'C' | 'D'): void {
    if (!this.isDev) {
      return;
    }
    if (this.lastWorkerTier !== tier) {
      this.logger.info('Worker pipeline quality tier change', {from: this.lastWorkerTier, to: tier});
      this.lastWorkerTier = tier;
    }
  }

  /**
   * Starts background video frame extraction pump.
   *
   * Extracts frames from an HTMLVideoElement at ~15fps and sends them to the
   * renderer/worker for virtual background mode. Uses requestVideoFrameCallback
   * (preferred) or requestAnimationFrame (fallback) for frame timing.
   *
   * The pump runs continuously until cancelled via backgroundPumpCancel.
   *
   * @param video - HTMLVideoElement to extract frames from.
   */
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
