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

import {getLogger, Logger} from 'Util/logger';

import type {
  BackgroundEffectsRenderingPipeline,
  PipelineConfig,
  PipelineInit,
} from './backgroundEffectsRenderingPipeline';

import type {QualityTier, QualityTierParams, SegmentationModelByTier} from '../backgroundEffectsWorkerTypes';
import {
  buildMetrics,
  createMetricsWindow,
  isProcessingMode,
  pushMetricsSample,
  QualityController,
  resetMetricsWindow,
  resolveQualityTierForEffectMode,
  resolveSegmentationModelPath,
} from '../quality';
import {WebGlRenderer} from '../renderer/webGlRenderer';
import type {MaskPostProcessor} from '../segmentation/maskPostProcessor';
import {NoopMaskPostProcessor} from '../segmentation/maskPostProcessor';
import {MediaPipeSegmenterFactory} from '../segmentation/mediaPipeSegmenter';
import type {SegmenterFactory, SegmenterLike} from '../segmentation/segmenterTypes';
import {buildMaskInput, type MaskInput, type MaskSource} from '../shared/mask';

/**
 * Main-thread WebGL2 rendering pipeline for background effects.
 *
 * This pipeline uses GPU-accelerated WebGL2 rendering on the main thread.
 * It performs segmentation using GPU delegate and renders effects using
 * a multi-pass WebGL rendering pipeline with shader programs.
 *
 * Performance characteristics:
 * - High quality rendering with GPU acceleration
 * - Runs on main thread (may impact UI responsiveness)
 * - Requires WebGL2 support
 * - Uses GPU-accelerated segmentation (faster than CPU)
 *
 * Rendering approach:
 * - Segmentation: GPU-based ML inference (MediaPipe GPU delegate)
 * - Background blur: Multi-pass Gaussian blur with downsampling
 * - Virtual background: WebGL texture compositing
 * - Mask refinement: Joint bilateral filtering, temporal smoothing
 */
export class MainWebGlPipeline implements BackgroundEffectsRenderingPipeline {
  public readonly type = 'main-webgl2' as const;
  private readonly logger: Logger;
  private renderer: WebGlRenderer | null = null;
  private segmenter: SegmenterLike | null = null;
  private segmenterFactory: SegmenterFactory = MediaPipeSegmenterFactory;
  private segmentationModelByTier: SegmentationModelByTier = {};
  private currentModelPath: string | null = null;
  private maskPostProcessor: MaskPostProcessor = new NoopMaskPostProcessor();
  private qualityController: QualityController | null = null;
  private outputCanvas: HTMLCanvasElement | null = null;
  private background: {bitmap: ImageBitmap; width: number; height: number} | null = null;
  private config: PipelineConfig | null = null;
  private onMetrics: PipelineInit['onMetrics'] = null;
  private onTierChange: PipelineInit['onTierChange'] | null = null;
  private getDroppedFrames: PipelineInit['getDroppedFrames'] | null = null;
  private readonly metricsMaxSamples = 30;
  private readonly metricsWindow = createMetricsWindow(this.metricsMaxSamples);
  private mainFrameCount = 0;

  constructor() {
    this.logger = getLogger('MainWebGlPipeline');
  }

  /**
   * Initializes the main WebGL2 pipeline.
   *
   * Sets up WebGL renderer, initializes segmenter with GPU delegate,
   * quality controller, and mask post-processor. Creates WebGL context
   * on the output canvas and compiles all shader programs.
   *
   * If segmentation initialization fails, the pipeline throws an error
   * (caller should fall back to another pipeline).
   *
   * @param init - BackgroundEffectsRenderingPipeline initialization parameters.
   * @throws Error if segmentation initialization fails.
   */
  public async init(init: PipelineInit): Promise<void> {
    this.outputCanvas = init.outputCanvas;
    this.config = init.config;
    this.onMetrics = init.onMetrics;
    this.onTierChange = init.onTierChange;
    this.getDroppedFrames = init.getDroppedFrames;
    this.mainFrameCount = 0;

    this.renderer = new WebGlRenderer(this.outputCanvas, this.outputCanvas.width, this.outputCanvas.height);
    this.segmenterFactory = init.createSegmenter ?? MediaPipeSegmenterFactory;
    this.segmentationModelByTier = init.segmentationModelByTier;
    const postProcessorFactory = init.createMaskPostProcessor ?? {
      create: () => new NoopMaskPostProcessor(),
    };
    this.maskPostProcessor = postProcessorFactory.create();
    this.qualityController = new QualityController(init.targetFps);
    if (this.qualityController && this.config?.quality === 'auto') {
      this.qualityController.setTier(init.initialTier);
    } else if (this.qualityController && this.config?.quality !== 'auto') {
      this.qualityController.setTier(this.config.quality);
    }
    const startingTier = init.config.quality === 'auto' ? init.initialTier : init.config.quality;
    const shouldInitSegmenter = startingTier !== 'bypass' && init.config.mode !== 'passthrough';
    if (shouldInitSegmenter) {
      this.segmenter = this.segmenterFactory.create({
        modelPath: init.segmentationModelPath,
        delegate: 'GPU',
        canvas: this.outputCanvas,
      });
      this.currentModelPath = init.segmentationModelPath;
      try {
        await this.segmenter.init();
      } catch (error) {
        this.logger.warn('Segmentation init failed, falling back to passthrough', error);
        this.segmenter?.close();
        this.segmenter = null;
        this.renderer?.destroy();
        this.renderer = null;
        throw error;
      }
    } else {
      this.segmenter = null;
      this.currentModelPath = null;
    }
  }

  /**
   * Updates pipeline configuration at runtime.
   *
   * Updates internal config and quality controller tier if quality
   * mode is fixed (not 'auto'). Adaptive quality updates happen
   * automatically during frame processing.
   *
   * @param config - New pipeline configuration.
   */
  public updateConfig(config: PipelineConfig): void {
    this.config = config;
    if (this.qualityController && config.quality !== 'auto') {
      this.qualityController.setTier(config.quality);
    }
  }

  /**
   * Processes a video frame through the main WebGL2 pipeline.
   *
   * Processing steps:
   * 1. Resolves quality tier parameters (adaptive or fixed)
   * 2. Ensures segmenter is initialized for current tier
   * 3. Performs segmentation (if cadence allows, GPU-accelerated)
   * 4. Applies mask post-processing
   * 5. Configures WebGL renderer with current settings
   * 6. Renders frame through multi-pass WebGL pipeline
   * 7. Updates quality controller and performance metrics
   *
   * The renderer performs mask refinement, temporal smoothing, blur passes,
   * and final compositing using GPU shaders for optimal performance.
   *
   * @param frame - Input video frame as ImageBitmap (will be closed after processing).
   * @param timestamp - Frame timestamp in seconds (used for temporal smoothing).
   * @param width - Frame width in pixels.
   * @param height - Frame height in pixels.
   * @returns Promise that resolves when frame processing is complete.
   */
  public async processFrame(frame: ImageBitmap, timestamp: number, width: number, height: number): Promise<void> {
    if (!this.renderer || !this.outputCanvas || !this.config) {
      frame.close();
      return;
    }

    const qualityTier = this.resolveQuality();
    if (!qualityTier.bypass) {
      await this.ensureSegmenterForTier(qualityTier.tier);
    }
    const frameIndex = this.mainFrameCount;
    this.mainFrameCount += 1;

    let maskInput: MaskInput | null = null;
    let maskBitmap: ImageBitmap | null = null;
    let releaseMaskResources: (() => void) | null = null;
    let segmentationMs = 0;
    if (!qualityTier.bypass && qualityTier.segmentationCadence > 0 && this.segmenter && this.qualityController) {
      if (frameIndex % qualityTier.segmentationCadence === 0) {
        this.segmenter.configure(qualityTier.segmentationWidth, qualityTier.segmentationHeight);
        const segStart = performance.now();
        const timestampMs = timestamp * 1000;
        const includeClassMask = this.config.debugMode === 'classOverlay' || this.config.debugMode === 'classOnly';
        const result = await this.segmenter.segment(frame, timestampMs, {includeClassMask});
        segmentationMs = performance.now() - segStart;
        const processed = await this.maskPostProcessor.process(result, {
          qualityTier,
          mode: this.config.mode,
          timestampMs,
          frameSize: {width, height},
        });
        if (processed !== result) {
          result.mask?.close();
          result.classMask?.close();
          result.release();
        }
        const useClassMask = includeClassMask && processed.classMask;
        const maskSource: MaskSource = useClassMask
          ? {
              mask: processed.classMask,
              maskTexture: null,
              width: processed.width,
              height: processed.height,
              release: processed.release,
            }
          : processed;
        if (useClassMask) {
          processed.mask?.close();
        } else {
          processed.classMask?.close();
        }
        const maskResult = buildMaskInput(maskSource);
        maskInput = maskResult.maskInput;
        maskBitmap = maskResult.maskBitmap;
        releaseMaskResources = maskResult.release;
      }
    }

    if (this.outputCanvas.width !== width || this.outputCanvas.height !== height) {
      this.outputCanvas.width = width;
      this.outputCanvas.height = height;
    }

    this.renderer.configure(
      width,
      height,
      qualityTier,
      this.config.mode,
      this.config.debugMode,
      this.config.blurStrength,
    );

    if (this.background) {
      this.renderer.setBackground(this.background.bitmap, this.background.width, this.background.height);
    }

    const gpuStart = performance.now();
    let gpuMs = 0;
    try {
      this.renderer.render(frame, maskInput);
    } finally {
      gpuMs = performance.now() - gpuStart;
      maskBitmap?.close();
      releaseMaskResources?.();
      frame.close();
    }

    if (this.config.quality === 'auto' && this.qualityController && isProcessingMode(this.config.mode)) {
      const updatedTier = this.qualityController.update(
        {totalMs: segmentationMs + gpuMs, segmentationMs, gpuMs},
        this.config.mode,
      );
      this.onTierChange?.(updatedTier.tier);
    }

    this.updateMetrics(segmentationMs + gpuMs, segmentationMs, gpuMs, qualityTier.tier);
  }

  /**
   * Sets a static background image for virtual background mode.
   *
   * Stores the bitmap and uploads it to the WebGL renderer as a texture.
   * The previous background bitmap is closed to prevent leaks.
   *
   * @param bitmap - Background image as ImageBitmap.
   * @param width - Image width in pixels.
   * @param height - Image height in pixels.
   */
  public setBackgroundImage(bitmap: ImageBitmap, width: number, height: number): void {
    this.background?.bitmap?.close();
    this.background = {bitmap, width, height};
    this.renderer?.setBackground(bitmap, width, height);
  }

  /**
   * Sets a video frame as background for virtual background mode.
   *
   * Delegates to setBackgroundImage since the renderer treats video
   * frames the same as static images (updates texture each frame).
   *
   * @param bitmap - Background video frame as ImageBitmap.
   * @param width - Frame width in pixels.
   * @param height - Frame height in pixels.
   */
  public setBackgroundVideoFrame(bitmap: ImageBitmap, width: number, height: number): void {
    this.setBackgroundImage(bitmap, width, height);
  }

  /**
   * Clears the background source.
   *
   * Closes the stored background bitmap, resets background state, and
   * clears the renderer's background texture.
   */
  public clearBackground(): void {
    this.background?.bitmap?.close();
    this.background = null;
    this.renderer?.setBackground(null, 0, 0);
  }

  /**
   * Notifies of dropped frames (no-op for main pipeline).
   *
   * Main WebGL pipeline doesn't need dropped frame notifications since it
   * processes frames synchronously on the main thread.
   *
   * @param _count - Dropped frame count (ignored).
   */
  public notifyDroppedFrames(_count: number): void {
    // No-op for main pipeline.
  }

  /**
   * Returns whether output canvas is transferred (always false).
   *
   * Main WebGL pipeline always runs on the main thread.
   *
   * @returns Always false.
   */
  public isOutputCanvasTransferred(): boolean {
    return false;
  }

  /**
   * Stops the pipeline and releases all resources.
   *
   * Closes segmenter, destroys WebGL renderer (releases all GPU resources),
   * releases background bitmaps, resets quality controller, and clears all
   * references. Should be called when the pipeline is no longer needed.
   */
  public stop(): void {
    this.background?.bitmap?.close();
    this.background = null;
    this.maskPostProcessor.reset();
    this.segmenter?.close();
    this.segmenter = null;
    this.currentModelPath = null;
    this.renderer?.destroy();
    this.renderer = null;
    this.qualityController = null;
    this.outputCanvas = null;
    this.config = null;
    this.onMetrics = null;
    this.onTierChange = null;
    this.getDroppedFrames = null;
    resetMetricsWindow(this.metricsWindow);
  }

  /**
   * Resolves quality tier parameters for the current configuration.
   *
   * Delegates to resolveQualityTierForEffectMode with the current quality
   * controller, quality mode, and effect mode. Returns bypass tier if
   * config is unavailable.
   *
   * @returns Quality tier parameters for current configuration.
   */
  private resolveQuality(): QualityTierParams {
    if (!this.config) {
      return resolveQualityTierForEffectMode(null, 'auto', 'blur');
    }
    return resolveQualityTierForEffectMode(this.qualityController, this.config.quality, this.config.mode);
  }

  /**
   * Ensures the segmenter is initialized for the specified quality tier.
   *
   * If the tier requires a different model than currently loaded, swaps
   * the segmenter instance. Skips swap if tier is 'D' (bypass), output canvas
   * is unavailable, or if the desired model is already loaded. Uses GPU delegate
   * for main WebGL pipeline.
   *
   * @param tier - Quality tier ).
   */
  private async ensureSegmenterForTier(tier: QualityTier): Promise<void> {
    if (!this.outputCanvas) {
      return;
    }
    if (tier === 'bypass') {
      return;
    }
    const desiredPath = resolveSegmentationModelPath(
      tier,
      this.segmentationModelByTier,
      this.currentModelPath ?? undefined,
    );
    if (this.currentModelPath === desiredPath && this.segmenter) {
      return;
    }
    const nextSegmenter = this.segmenterFactory.create({
      modelPath: desiredPath,
      delegate: 'GPU',
      canvas: this.outputCanvas,
    });
    try {
      await nextSegmenter.init();
    } catch (error) {
      this.logger.warn('Segmentation model swap failed, keeping previous model', error);
      nextSegmenter.close();
      return;
    }
    this.segmenter?.close();
    this.segmenter = nextSegmenter;
    this.currentModelPath = desiredPath;
  }

  /**
   * Updates performance metrics and invokes metrics callback.
   *
   * Adds a new sample to the metrics window, updates quality tier if in
   * adaptive mode, and invokes the onMetrics callback with aggregated metrics.
   * Uses 'GPU' as the segmentation delegate since MainWebGlPipeline uses GPU inference.
   *
   * @param totalMs - Total frame processing time in milliseconds.
   * @param segmentationMs - Segmentation processing time in milliseconds.
   * @param gpuMs - WebGL rendering time in milliseconds.
   * @param tier - Current quality tier.
   */
  private updateMetrics(totalMs: number, segmentationMs: number, gpuMs: number, tier: QualityTier): void {
    if (!this.onMetrics || !this.getDroppedFrames) {
      return;
    }
    pushMetricsSample(this.metricsWindow, {totalMs, segmentationMs, gpuMs});
    // MainWebGlPipeline uses GPU delegate
    const segmentationDelegate = this.segmenter?.getDelegate?.() ?? 'GPU';
    this.onMetrics(buildMetrics(this.metricsWindow, this.getDroppedFrames(), tier, segmentationDelegate));
  }

  public getCurrentModelPath(): string | null {
    return '';
  }
}
