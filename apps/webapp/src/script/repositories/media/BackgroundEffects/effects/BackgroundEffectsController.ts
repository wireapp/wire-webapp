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

import {TARGET_FPS} from 'Repositories/media/BackgroundEffectsHandler';
import {getLogger, Logger} from 'Util/Logger';

import {detectCapabilities, choosePipeline} from './capability';
import {FrameSource} from './FrameSource';

import {Canvas2DPipeline} from '../pipelines/Canvas2DPipeline';
import {MainWebGLPipeline} from '../pipelines/MainWebGLPipeline';
import {PassthroughPipeline} from '../pipelines/PassthroughPipeline';
import type {Pipeline, PipelineConfig} from '../pipelines/Pipeline';
import {WorkerWebGLPipeline} from '../pipelines/WorkerWebGLPipeline';
import {resolveQualityPolicy, resolveSegmentationModelPath, TIER_DEFINITIONS} from '../quality';
import type {
  CapabilityInfo,
  DebugMode,
  EffectMode,
  Metrics,
  PipelineType,
  QualityMode,
  QualityTier,
  SegmentationModelByTier,
  StartOptions,
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
  /** Frame source adapter for extracting frames from input track. */
  private frameSource: FrameSource | null = null;
  /** Output canvas for rendering processed frames. */
  private outputCanvas: HTMLCanvasElement | null = null;
  /** Output MediaStreamTrack from canvas.captureStream(). */
  private outputTrack: MediaStreamTrack | null = null;
  /** Active pipeline implementation. */
  private pipelineImpl: Pipeline | null = null;
  /** Current effect mode ('blur', 'virtual', or 'passthrough'). */
  private mode: EffectMode = 'blur';
  /** Current debug visualization mode. */
  private debugMode: DebugMode = 'off';
  /** Blur strength (0-1) for blur effect mode. */
  private blurStrength = 0.5;
  /** Quality mode ('auto' for adaptive, or fixed tier. */
  private quality: QualityMode = 'auto';
  /** Target frames per second for adaptive quality control. */
  private targetFps = TARGET_FPS;
  /** Per-tier segmentation model overrides. */
  private segmentationModelByTier: SegmentationModelByTier = {
    superhigh: TIER_DEFINITIONS.superhigh.modelPath,
    high: TIER_DEFINITIONS.high.modelPath,
    medium: TIER_DEFINITIONS.medium.modelPath,
    low: TIER_DEFINITIONS.low.modelPath,
    bypass: TIER_DEFINITIONS.bypass.modelPath,
  };
  /** Selected rendering pipeline. */
  private pipeline: PipelineType = 'passthrough';
  /** Cancel function for background video pump (stops video frame extraction). */
  private backgroundPumpCancel: (() => void) | null = null;
  /** Counter for dropped frames (backpressure and frame skips). */
  private droppedFrames = 0;
  /** WebGL context loss handler (main-webgl2 pipeline). */
  private webglContextLossHandler: ((event: Event) => void) | null = null;
  /** WebGL context restoration handler (main-webgl2 pipeline). */
  private webglContextRestoreHandler: (() => void) | null = null;
  /** Tracks whether the main WebGL context is currently lost. */
  private webglContextLost = false;
  /** Pipeline to attempt to restore after context loss. */
  private webglRestorePipeline: PipelineType | null = null;
  /** Last quality tier for main pipeline (for logging tier changes). */
  private lastMainTier: QualityTier | null = null;
  /** Last quality tier for worker pipeline (for logging tier changes). */
  private lastWorkerTier: QualityTier | null = null;
  /** Optional metrics callback for demo/telemetry use. */
  private onMetrics: ((metrics: Metrics) => void) | null = null;

  private onModelChange: ((model: string) => void) | null = null;
  /** Tracks shutdown to avoid logging expected stop errors. */
  private isStopping = false;
  private capabilityInfo: CapabilityInfo = {
    offscreenCanvas: false,
    worker: false,
    webgl2: false,
    requestVideoFrameCallback: false,
  };
  private maxQualityTier: QualityTier = 'superhigh';

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
    this.isStopping = false;
    // Apply configuration options (use defaults if not provided)
    this.mode = opts.mode ?? this.mode;
    this.debugMode = opts.debugMode ?? this.debugMode;
    this.blurStrength = opts.blurStrength ?? this.blurStrength;
    this.quality = opts.quality ?? this.quality;
    this.targetFps = opts.targetFps ?? this.targetFps;
    // Detect capabilities and select optimal pipeline
    const cap = detectCapabilities();
    this.capabilityInfo = cap;
    const policy = resolveQualityPolicy(cap, opts.qualityPolicy ?? 'auto');

    if (opts.segmentationModelPath) {
      this.segmentationModelByTier = {
        superhigh: opts.segmentationModelPath,
        high: opts.segmentationModelPath,
        medium: opts.segmentationModelPath,
        low: opts.segmentationModelPath,
        bypass: opts.segmentationModelPath,
      };
    } else if (opts.segmentationModelByTier || policy.segmentationModelByTier) {
      this.segmentationModelByTier = {
        superhigh: TIER_DEFINITIONS.superhigh.modelPath,
        high: TIER_DEFINITIONS.high.modelPath,
        medium: TIER_DEFINITIONS.medium.modelPath,
        low: TIER_DEFINITIONS.low.modelPath,
        bypass: TIER_DEFINITIONS.bypass.modelPath,
        ...policy.segmentationModelByTier,
        ...opts.segmentationModelByTier,
      };
    } else {
      this.segmentationModelByTier = {
        superhigh: TIER_DEFINITIONS.superhigh.modelPath,
        high: TIER_DEFINITIONS.high.modelPath,
        medium: TIER_DEFINITIONS.medium.modelPath,
        low: TIER_DEFINITIONS.low.modelPath,
        bypass: TIER_DEFINITIONS.bypass.modelPath,
      };
    }
    this.onMetrics = opts.onMetrics ?? null;
    this.onModelChange = opts.onModelChange ?? null;
    this.droppedFrames = 0;
    this.pipelineImpl = null;

    const chosenPipeline = choosePipeline(cap, opts.useWorker !== false);
    this.pipeline = opts.pipelineOverride ?? chosenPipeline;

    this.logger.info('Background effects capabilities', cap);
    this.logger.info('Background effects pipeline', {
      chosen: chosenPipeline,
      override: opts.pipelineOverride ?? null,
      active: this.pipeline,
    });

    // Initialize frame source for frame extraction
    this.frameSource = new FrameSource(inputTrack);
    // Create output canvas for rendering
    this.outputCanvas = document.createElement('canvas');

    // Set canvas dimensions from input track settings
    const settings = inputTrack.getSettings();
    this.outputCanvas.width = settings.width ?? 640;
    this.outputCanvas.height = settings.height ?? 480;

    // Initialize selected pipeline
    await this.initPipeline(this.pipeline);
    // Start frame processing loop
    await this.frameSource.start(
      async (frame, timestamp, width, height) => {
        if (!this.outputCanvas) {
          try {
            frame.close();
          } catch {
            // Ignore close errors.
          }
          return;
        }
        // Skip frames with invalid dimensions
        if (width === 0 || height === 0) {
          try {
            frame.close();
          } catch {
            // Ignore close errors.
          }
          return;
        }
        // Resize canvas if dimensions changed (skip if transferred to worker)
        if (
          !this.pipelineImpl?.isOutputCanvasTransferred() &&
          (this.outputCanvas.width !== width || this.outputCanvas.height !== height)
        ) {
          try {
            this.outputCanvas.width = width;
            this.outputCanvas.height = height;
          } catch (error) {
            this.logger.warn('Failed to resize output canvas', error);
          }
        }

        try {
          await this.handleFrame(frame, timestamp, width, height);
        } catch (error) {
          try {
            frame.close();
          } catch {
            // Ignore close errors.
          }
          if (this.isStopping) {
            return;
          }
          this.logger.warn('Frame handling failed', error);
        }
      },
      () => {
        const count = this.handleFrameDrop();
        this.pipelineImpl?.notifyDroppedFrames(count);
      },
    );

    // Create output MediaStreamTrack from canvas
    const captureStream = this.outputCanvas.captureStream(this.targetFps);
    this.outputTrack = captureStream.getVideoTracks()[0];

    // Stop pipeline when input track ends
    inputTrack.addEventListener('ended', async () => await this.stop());

    // Set background sources if provided
    if (opts.backgroundImage) {
      this.setBackgroundSource(opts.backgroundImage);
    }
    if (opts.backgroundVideo) {
      this.setBackgroundSource(opts.backgroundVideo);
    }
    if (opts.backgroundColor) {
      this.setBackgroundColor(opts.backgroundColor);
    }

    return {
      outputTrack: this.outputTrack,
      stop: async () => await this.stop(),
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
    this.logger.info('Background effects mode', mode);
    this.updatePipelineConfig();
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
    this.updatePipelineConfig();
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
          if (!this.pipelineImpl) {
            bitmap.close();
            return;
          }
          this.pipelineImpl.setBackgroundImage(bitmap, source.naturalWidth, source.naturalHeight);
        })
        .catch((error: unknown) => this.logger.warn('Failed to set background image', error));
      return;
    }

    if (source instanceof HTMLVideoElement) {
      this.startBackgroundVideoPump(source);
      return;
    }

    if (!this.pipelineImpl) {
      source.close();
      return;
    }
    this.pipelineImpl.setBackgroundImage(source, source.width, source.height);
  }

  /**
   * Sets a solid-color background for virtual background mode.
   *
   * Creates a 1x1 ImageBitmap filled with the requested color and reuses the
   * existing background source pipeline.
   *
   * @param color - CSS color string (e.g., '#112233' or 'rgb(0, 0, 0)').
   */
  public setBackgroundColor(color: string): void {
    this.backgroundPumpCancel?.();
    this.backgroundPumpCancel = null;
    this.createSolidColorBitmap(color)
      .then(bitmap => {
        if (!this.pipelineImpl) {
          bitmap.close();
          return;
        }
        this.pipelineImpl.setBackgroundImage(bitmap, 1, 1);
      })
      .catch((error: unknown) => this.logger.warn('Failed to set solid background color', error));
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
    this.updatePipelineConfig();
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
    this.updatePipelineConfig();
  }

  public getQuality(): QualityMode {
    return this.quality;
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
  public async stop(): Promise<void> {
    this.isStopping = true;
    this.backgroundPumpCancel?.();
    this.backgroundPumpCancel = null;
    this.pipelineImpl?.stop();
    this.pipelineImpl = null;

    this.frameSource?.stop();
    this.frameSource = null;

    this.outputTrack?.stop();
    this.outputTrack = null;

    this.detachWebGLContextHandlers();
    this.webglContextLost = false;
    this.webglRestorePipeline = null;
    this.outputCanvas = null;
    this.onMetrics = null;
    this.pipeline = 'passthrough';
  }

  private async initPipeline(type: PipelineType): Promise<void> {
    if (!this.outputCanvas) {
      return;
    }
    this.detachWebGLContextHandlers();
    this.pipelineImpl?.stop();
    this.pipelineImpl = this.createPipeline(type);
    this.pipeline = type;

    const config: PipelineConfig = {
      mode: this.mode,
      debugMode: this.debugMode,
      blurStrength: this.blurStrength,
      quality: this.quality,
    };

    const cap = detectCapabilities();
    const policy = resolveQualityPolicy(cap, 'auto');
    const initialTier = this.quality === 'auto' ? policy.initialTier : this.quality;
    const segmentationModelPath = resolveSegmentationModelPath(initialTier, this.segmentationModelByTier, undefined);

    try {
      await this.pipelineImpl.init({
        outputCanvas: this.outputCanvas,
        targetFps: this.targetFps,
        segmentationModelPath,
        segmentationModelByTier: this.segmentationModelByTier,
        initialTier,
        maxTier: this.maxQualityTier,
        config,
        onMetrics: this.onMetrics,
        onTierChange: tier => this.handleTierChange(tier),
        onDroppedFrame: () => this.handleFrameDrop(),
        getDroppedFrames: () => this.droppedFrames,
        onWorkerSegmenterError: error => {
          if (this.isDev) {
            this.logger.warn('Worker segmenter init failed', error);
          }
        },
        onWorkerContextLoss: () => this.handleWorkerContextLoss(),
      });
    } catch (error) {
      this.logger.warn('Pipeline init failed, falling back to passthrough', error);
      this.pipelineImpl?.stop();
      this.pipelineImpl = new PassthroughPipeline();
      this.pipeline = 'passthrough';
      await this.pipelineImpl.init({
        outputCanvas: this.outputCanvas,
        targetFps: this.targetFps,
        segmentationModelPath,
        segmentationModelByTier: this.segmentationModelByTier,
        initialTier,
        maxTier: this.maxQualityTier,
        config,
        onMetrics: this.onMetrics,
        onTierChange: tier => this.handleTierChange(tier),
        onDroppedFrame: () => this.handleFrameDrop(),
        getDroppedFrames: () => this.droppedFrames,
        onWorkerContextLoss: () => this.handleWorkerContextLoss(),
      });
    }

    if (this.pipeline === 'main-webgl2') {
      this.bindWebGLContextHandlers();
    }
  }

  private createPipeline(type: PipelineType): Pipeline {
    switch (type) {
      case 'worker-webgl2':
        return new WorkerWebGLPipeline();
      case 'main-webgl2':
        return new MainWebGLPipeline();
      case 'canvas2d':
        return new Canvas2DPipeline();
      default:
        return new PassthroughPipeline();
    }
  }

  private updatePipelineConfig(): void {
    if (!this.pipelineImpl) {
      return;
    }
    this.pipelineImpl.updateConfig({
      mode: this.mode,
      debugMode: this.debugMode,
      blurStrength: this.blurStrength,
      quality: this.quality,
    });
  }

  private bindWebGLContextHandlers(): void {
    if (!this.outputCanvas || this.webglContextLossHandler || this.pipeline !== 'main-webgl2') {
      return;
    }
    this.webglContextLossHandler = event => {
      event.preventDefault();
      this.handleWebGLContextLost();
    };
    this.webglContextRestoreHandler = () => {
      void this.handleWebGLContextRestored();
    };
    this.outputCanvas.addEventListener('webglcontextlost', this.webglContextLossHandler as EventListener, {
      passive: false,
    });
    this.outputCanvas.addEventListener('webglcontextrestored', this.webglContextRestoreHandler as EventListener);
  }

  private detachWebGLContextHandlers(): void {
    if (!this.outputCanvas || !this.webglContextLossHandler || !this.webglContextRestoreHandler) {
      return;
    }
    this.outputCanvas.removeEventListener('webglcontextlost', this.webglContextLossHandler as EventListener);
    this.outputCanvas.removeEventListener('webglcontextrestored', this.webglContextRestoreHandler as EventListener);
    this.webglContextLossHandler = null;
    this.webglContextRestoreHandler = null;
  }

  private handleWebGLContextLost(): void {
    if (this.webglContextLost || this.pipeline !== 'main-webgl2') {
      return;
    }
    this.webglContextLost = true;
    this.webglRestorePipeline = this.pipeline;
    this.logger.warn('WebGL context lost; falling back to passthrough');
    void this.initPipeline('passthrough');
  }

  private async handleWebGLContextRestored(): Promise<void> {
    if (!this.webglContextLost || this.webglRestorePipeline !== 'main-webgl2') {
      return;
    }
    if (!this.outputCanvas) {
      return;
    }
    this.logger.info('WebGL context restored; restarting main pipeline');
    try {
      await this.initPipeline('main-webgl2');
    } catch (error) {
      this.logger.warn('Failed to restore WebGL pipeline; staying in passthrough', error);
    } finally {
      this.webglContextLost = false;
      this.webglRestorePipeline = null;
    }
  }

  /**
   * Handles WebGL context loss in the worker pipeline.
   *
   * When the worker's WebGL context is lost (e.g., due to GPU driver issues,
   * system sleep, or resource constraints), this method falls back to passthrough
   * mode to ensure video continues to work, albeit without effects.
   *
   * Only handles context loss for worker-webgl2 pipeline. Main-thread WebGL
   * context loss is handled separately via bindWebGLContextHandlers().
   *
   * @returns Nothing.
   */
  private handleWorkerContextLoss(): void {
    if (this.isStopping || this.pipeline !== 'worker-webgl2') {
      return;
    }
    this.logger.warn('Worker WebGL context lost; falling back to passthrough');
    void this.initPipeline('passthrough');
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
  private async handleFrame(frame: ImageBitmap, timestamp: number, width: number, height: number): Promise<void> {
    if (!this.pipelineImpl) {
      frame.close();
      return;
    }
    await this.pipelineImpl.processFrame(frame, timestamp, width, height);
  }

  private handleFrameDrop(): number {
    this.droppedFrames += 1;
    return this.droppedFrames;
  }

  private handleTierChange(tier: QualityTier): void {
    const newModel = resolveSegmentationModelPath(tier, this.segmentationModelByTier, undefined);
    if (this.onModelChange !== null) {
      this.onModelChange(newModel);
    }
    this.logger.info('Quality tier changed', tier, newModel);

    if (this.pipeline === 'worker-webgl2') {
      this.maybeLogWorkerTierChange(tier);
      return;
    }
    this.maybeLogMainTierChange(tier);
  }

  /**
   * Logs quality tier changes for main pipeline (development only).
   *
   * @param tier - New quality tier.
   */
  private maybeLogMainTierChange(tier: QualityTier): void {
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
  private maybeLogWorkerTierChange(tier: QualityTier): void {
    if (this.lastWorkerTier !== tier) {
      this.logger.info('Worker pipeline quality tier change', {from: this.lastWorkerTier, to: tier});
      this.lastWorkerTier = tier;
    }
  }

  private async createSolidColorBitmap(color: string): Promise<ImageBitmap> {
    const canvas =
      typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
    const isOffscreen = typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas;
    if (!isOffscreen) {
      (canvas as HTMLCanvasElement).width = 1;
      (canvas as HTMLCanvasElement).height = 1;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create 2D context for solid background.');
    }
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return createImageBitmap(canvas as OffscreenCanvas | HTMLCanvasElement);
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
    const targetInterval = 1000 / this.targetFps;
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
        if (!this.pipelineImpl) {
          bitmap.close();
        } else {
          this.pipelineImpl.setBackgroundVideoFrame(bitmap, video.videoWidth, video.videoHeight);
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
      this.pipelineImpl?.clearBackground();
    };
  }

  isProcessing() {
    return this.pipelineImpl !== null;
  }

  public getCapabilityInfo(): CapabilityInfo {
    return this.capabilityInfo;
  }

  public setMaxQualityTier(quality: QualityTier) {
    this.maxQualityTier = quality;
  }

  public getMaxQualityTier(): QualityTier {
    return this.maxQualityTier;
  }
}
