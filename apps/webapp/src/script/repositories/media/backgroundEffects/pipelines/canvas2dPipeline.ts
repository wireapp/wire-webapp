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
  computeBlurRadius,
  createMetricsWindow,
  isProcessingMode,
  pushMetricsSample,
  QualityController,
  resetMetricsWindow,
  resolveQualityTierForEffectMode,
  resolveSegmentationModelPath,
} from '../quality';
import type {MaskPostProcessor} from '../segmentation/maskPostProcessor';
import {NoopMaskPostProcessor} from '../segmentation/maskPostProcessor';
import {MediaPipeSegmenterFactory} from '../segmentation/mediaPipeSegmenter';
import type {SegmenterFactory, SegmenterLike} from '../segmentation/segmenterTypes';

/**
 * Canvas2D-based rendering pipeline for background effects.
 *
 * This pipeline uses CPU-based Canvas2D API for rendering, making it a
 * fallback option when WebGL2 is unavailable. It performs segmentation
 * using CPU delegate and renders effects using Canvas2D compositing operations.
 *
 * Performance characteristics:
 * - Lower quality than WebGL pipelines (no GPU acceleration)
 * - Runs on main thread (may impact UI responsiveness)
 * - Widely supported across browsers
 * - Uses CPU-based blur filter (less efficient than GPU blur)
 *
 * Rendering approach:
 * - Segmentation: CPU-based ML inference
 * - Background blur: Canvas2D filter API
 * - Virtual background: Canvas2D drawImage with compositing
 * - Mask compositing: destination-in blend mode
 */
export class Canvas2dPipeline implements BackgroundEffectsRenderingPipeline {
  public readonly type = 'canvas2d' as const;
  private readonly logger: Logger;
  private outputCanvas: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private foregroundCanvas: HTMLCanvasElement | null = null;
  private foregroundCtx: CanvasRenderingContext2D | null = null;
  private debugCanvas: HTMLCanvasElement | null = null;
  private debugCtx: CanvasRenderingContext2D | null = null;
  private maskCanvas: HTMLCanvasElement | null = null;
  private maskCtx: CanvasRenderingContext2D | null = null;
  private maskScratchCanvas: HTMLCanvasElement | null = null;
  private maskScratchCtx: CanvasRenderingContext2D | null = null;
  private hasMask = false;
  private segmenter: SegmenterLike | null = null;
  private segmenterFactory: SegmenterFactory = MediaPipeSegmenterFactory;
  private segmentationModelByTier: SegmentationModelByTier = {};
  private currentModelPath: string | null = null;
  private maskPostProcessor: MaskPostProcessor = new NoopMaskPostProcessor();
  private qualityController: QualityController | null = null;
  private config: PipelineConfig | null = null;
  private onMetrics: PipelineInit['onMetrics'] = null;
  private onTierChange: PipelineInit['onTierChange'] | null = null;
  private getDroppedFrames: PipelineInit['getDroppedFrames'] | null = null;
  private readonly metricsMaxSamples = 30;
  private readonly metricsWindow = createMetricsWindow(this.metricsMaxSamples);
  private mainFrameCount = 0;
  private canvasFrameToken = 0;
  private canvasPassthroughLogged = false;
  private background: {bitmap: ImageBitmap; width: number; height: number} | null = null;

  constructor() {
    this.logger = getLogger('Canvas2dPipeline');
  }

  /**
   * Initializes the Canvas2D pipeline.
   *
   * Sets up Canvas2D contexts (output, foreground, debug), initializes
   * segmenter with CPU delegate, quality controller, and mask post-processor.
   * Creates foreground and debug canvases for compositing operations.
   *
   * If segmentation initialization fails, the pipeline will run in passthrough
   * mode (no effects applied).
   *
   * @param init - BackgroundEffectsRenderingPipeline initialization parameters.
   * @throws Error if Canvas2D context is unavailable.
   */
  public async init(init: PipelineInit): Promise<void> {
    this.outputCanvas = init.outputCanvas;
    this.config = init.config;
    this.onMetrics = init.onMetrics;
    this.onTierChange = init.onTierChange;
    this.getDroppedFrames = init.getDroppedFrames;
    this.mainFrameCount = 0;
    this.canvasFrameToken = 0;
    this.canvasPassthroughLogged = false;
    this.maskCanvas = null;
    this.maskCtx = null;
    this.maskScratchCanvas = null;
    this.maskScratchCtx = null;
    this.hasMask = false;

    const ctx = this.outputCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas2D context unavailable');
    }
    this.canvasCtx = ctx;
    this.foregroundCanvas = document.createElement('canvas');
    this.foregroundCanvas.width = this.outputCanvas.width;
    this.foregroundCanvas.height = this.outputCanvas.height;
    this.foregroundCtx = this.foregroundCanvas.getContext('2d');
    this.debugCanvas = document.createElement('canvas');
    this.debugCanvas.width = this.outputCanvas.width;
    this.debugCanvas.height = this.outputCanvas.height;
    this.debugCtx = this.debugCanvas.getContext('2d');

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
        delegate: 'CPU',
      });
      this.currentModelPath = init.segmentationModelPath;
      try {
        await this.segmenter.init();
      } catch (error) {
        this.logger.warn('Segmentation init failed, canvas2d will pass through', error);
        this.segmenter = null;
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
   * Processes a video frame through the Canvas2D pipeline.
   *
   * Processing steps:
   * 1. Checks for bypass mode (passthrough or no segmenter) and returns early if needed
   * 2. Resolves quality tier parameters (adaptive or fixed)
   * 3. Checks quality tier bypass and returns early if needed
   * 4. Ensures segmenter is initialized for current tier
   * 5. Captures frame index before incrementing for cadence calculation
   * 6. Performs segmentation (if cadence allows, respecting frame token)
   * 7. Applies mask post-processing
   * 8. Applies temporal mask smoothing via updateMaskCanvas() (if mask available)
   * 9. Renders background (blur using Canvas2D filter or virtual background)
   * 10. Composites foreground using temporally-smoothed mask with destination-in blend mode
   * 11. Updates quality controller inline (if in 'auto' mode) and performance metrics
   *
   * Supports debug visualization modes (maskOverlay, maskOnly, edgeOnly,
   * classOverlay, classOnly). Handles frame token validation to prevent
   * race conditions when frames arrive faster than processing. Uses temporally-smoothed
   * masks (maskForEffect) instead of raw masks for better visual stability.
   *
   * @param frame - Input video frame as ImageBitmap (will be closed after processing).
   * @param _timestamp - Frame timestamp (unused, uses performance.now() for segmentation).
   * @param width - Frame width in pixels.
   * @param height - Frame height in pixels.
   * @returns Promise that resolves when frame processing is complete.
   */
  public async processFrame(frame: ImageBitmap, _timestamp: number, width: number, height: number): Promise<void> {
    if (!this.outputCanvas || !this.canvasCtx || !this.config) {
      frame.close();
      return;
    }
    const ctx = this.canvasCtx;
    this.foregroundCanvas!.width = width;
    this.foregroundCanvas!.height = height;
    if (this.debugCanvas) {
      this.debugCanvas.width = width;
      this.debugCanvas.height = height;
    }
    ctx.clearRect(0, 0, width, height);

    if (this.config.mode === 'passthrough' || !this.segmenter || !this.qualityController) {
      if (!this.segmenter && !this.canvasPassthroughLogged) {
        this.logger.warn('Canvas2D pipeline running without segmenter; output will be passthrough');
        this.canvasPassthroughLogged = true;
      }
      ctx.drawImage(frame, 0, 0, width, height);
      frame.close();
      return;
    }

    const qualityTier = this.resolveQuality();
    if (qualityTier.bypass) {
      ctx.drawImage(frame, 0, 0, width, height);
      frame.close();
      return;
    }
    if (!qualityTier.bypass) {
      await this.ensureSegmenterForTier(qualityTier.tier);
    }
    const frameIndex = this.mainFrameCount;
    this.mainFrameCount += 1;
    const token = ++this.canvasFrameToken;

    let result:
      | {mask: ImageBitmap | null; classMask: ImageBitmap | null; durationMs: number; release: () => void}
      | {mask: null; classMask: ImageBitmap | null; durationMs: number; release: () => void};
    if (qualityTier.segmentationCadence > 0 && frameIndex % qualityTier.segmentationCadence === 0) {
      this.segmenter.configure(qualityTier.segmentationWidth, qualityTier.segmentationHeight);
      const timestampMs = performance.now();
      const includeClassMask = this.config.debugMode === 'classOverlay' || this.config.debugMode === 'classOnly';
      const segmentation = await this.segmenter.segment(frame, timestampMs, {includeClassMask});
      const processed = await this.maskPostProcessor.process(segmentation, {
        qualityTier,
        mode: this.config.mode,
        timestampMs,
        frameSize: {width, height},
      });
      if (processed !== segmentation) {
        segmentation.mask?.close();
        segmentation.classMask?.close();
        segmentation.release();
      }
      result = {
        mask: processed.mask,
        classMask: processed.classMask,
        durationMs: processed.durationMs,
        release: processed.release,
      };
    } else {
      result = {mask: null, classMask: null, durationMs: 0, release: () => {}};
    }

    if (token !== this.canvasFrameToken) {
      result.mask?.close();
      result.release();
      frame.close();
      return;
    }

    const mask = result.mask;
    const classMask = result.classMask;
    if (mask) {
      this.updateMaskCanvas(mask, width, height, qualityTier.temporalAlpha);
    }
    const maskForEffect = this.hasMask ? this.maskCanvas : null;
    const renderStart = performance.now();
    try {
      const isClassDebug = this.config.debugMode === 'classOverlay' || this.config.debugMode === 'classOnly';
      const activeMask = isClassDebug ? classMask : maskForEffect;
      if (this.config.debugMode !== 'off') {
        ctx.clearRect(0, 0, width, height);
        if (!activeMask) {
          ctx.drawImage(frame, 0, 0, width, height);
        } else if (this.config.debugMode === 'maskOnly') {
          ctx.drawImage(activeMask, 0, 0, width, height);
        } else if (this.config.debugMode === 'maskOverlay') {
          ctx.drawImage(frame, 0, 0, width, height);
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#00ff00';
          ctx.globalCompositeOperation = 'source-atop';
          ctx.drawImage(activeMask, 0, 0, width, height);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        } else if (this.config.debugMode === 'edgeOnly') {
          this.renderEdgeMask(ctx, activeMask, width, height);
        } else if (this.config.debugMode === 'classOnly' && classMask) {
          this.renderClassMask(ctx, classMask, width, height, false, frame);
        } else if (this.config.debugMode === 'classOverlay' && classMask) {
          this.renderClassMask(ctx, classMask, width, height, true, frame);
        }
        const renderMs = performance.now() - renderStart;
        const totalMs = result.durationMs + renderMs;
        let metricsTier = qualityTier.tier;
        if (this.config.quality === 'auto' && this.qualityController && isProcessingMode(this.config.mode)) {
          const updatedTier = this.qualityController.update(
            {totalMs, segmentationMs: result.durationMs, gpuMs: renderMs},
            this.config.mode,
          );
          metricsTier = updatedTier.tier;
          this.onTierChange?.(updatedTier.tier);
        }
        this.updateMetrics(totalMs, result.durationMs, renderMs, metricsTier);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      const blurPx = computeBlurRadius(qualityTier, this.config.blurStrength, false);
      if (this.config.mode === 'virtual' && this.background) {
        ctx.drawImage(this.background.bitmap, 0, 0, this.background.width, this.background.height, 0, 0, width, height);
      } else {
        ctx.filter = `blur(${blurPx}px)`;
        ctx.drawImage(frame, 0, 0, width, height);
        ctx.filter = 'none';
      }

      if (maskForEffect && this.foregroundCtx) {
        this.foregroundCtx.clearRect(0, 0, width, height);
        this.foregroundCtx.drawImage(frame, 0, 0, width, height);
        this.foregroundCtx.globalCompositeOperation = 'destination-in';
        this.foregroundCtx.drawImage(maskForEffect, 0, 0, width, height);
        this.foregroundCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.foregroundCanvas!, 0, 0, width, height);
      } else {
        ctx.drawImage(frame, 0, 0, width, height);
      }

      const renderMs = performance.now() - renderStart;
      const totalMs = result.durationMs + renderMs;
      let metricsTier = qualityTier.tier;
      if (this.config.quality === 'auto' && this.qualityController && isProcessingMode(this.config.mode)) {
        const updatedTier = this.qualityController.update(
          {totalMs, segmentationMs: result.durationMs, gpuMs: renderMs},
          this.config.mode,
        );
        metricsTier = updatedTier.tier;
        this.onTierChange?.(updatedTier.tier);
      }
      this.updateMetrics(totalMs, result.durationMs, renderMs, metricsTier);
    } finally {
      mask?.close();
      classMask?.close();
      result.release();
      frame.close();
    }
  }

  /**
   * Sets a static background image for virtual background mode.
   *
   * Stores the bitmap and uses it for all subsequent frames until cleared
   * or replaced. The previous background bitmap is closed to prevent leaks.
   *
   * @param bitmap - Background image as ImageBitmap.
   * @param width - Image width in pixels.
   * @param height - Image height in pixels.
   */
  public setBackgroundImage(bitmap: ImageBitmap, width: number, height: number): void {
    this.background?.bitmap?.close();
    this.background = {bitmap, width, height};
  }

  /**
   * Sets a video frame as background for virtual background mode.
   *
   * Delegates to setBackgroundImage since Canvas2D pipeline treats
   * video frames the same as static images.
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
   * Closes the stored background bitmap and resets background state.
   */
  public clearBackground(): void {
    this.background?.bitmap?.close();
    this.background = null;
  }

  /**
   * Notifies of dropped frames (no-op for Canvas2D).
   *
   * Canvas2D pipeline doesn't need dropped frame notifications since it
   * processes frames synchronously on the main thread.
   *
   * @param _count - Dropped frame count (ignored).
   */
  public notifyDroppedFrames(_count: number): void {
    // No-op for canvas2d.
  }

  /**
   * Returns whether output canvas is transferred (always false).
   *
   * Canvas2D pipeline always runs on the main thread.
   *
   * @returns Always false.
   */
  public isOutputCanvasTransferred(): boolean {
    return false;
  }

  /**
   * Renders class mask visualization for debug modes.
   *
   * Converts class mask ImageBitmap to colored visualization by mapping
   * class IDs to HSV-based colors. Supports overlay and standalone modes.
   * Uses a debug canvas for pixel manipulation before rendering.
   *
   * @param ctx - Canvas2D rendering context for output.
   * @param mask - Class mask ImageBitmap with class IDs encoded in RGB channels.
   * @param width - Mask width in pixels.
   * @param height - Mask height in pixels.
   * @param overlay - If true, overlays colored mask on video frame; if false, shows only mask.
   * @param frame - Original video frame (used for overlay mode).
   */
  private renderClassMask(
    ctx: CanvasRenderingContext2D,
    mask: ImageBitmap,
    width: number,
    height: number,
    overlay: boolean,
    frame: ImageBitmap,
  ): void {
    if (!this.debugCanvas || !this.debugCtx) {
      if (overlay) {
        ctx.drawImage(frame, 0, 0, width, height);
      }
      ctx.drawImage(mask, 0, 0, width, height);
      return;
    }
    this.debugCtx.clearRect(0, 0, width, height);
    this.debugCtx.drawImage(mask, 0, 0, width, height);
    const imageData = this.debugCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const classId = data[i];
      if (classId === 0) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = overlay ? 0 : 255;
        continue;
      }
      const [r, g, b] = this.classColor(classId);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
    this.debugCtx.putImageData(imageData, 0, 0);
    if (overlay) {
      ctx.drawImage(frame, 0, 0, width, height);
      ctx.globalAlpha = 0.6;
      ctx.drawImage(this.debugCanvas, 0, 0, width, height);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(this.debugCanvas, 0, 0, width, height);
    }
  }

  /**
   * Generates a color for a class ID using HSV color space.
   *
   * Uses a fixed saturation and value with hue derived from class ID
   * to ensure distinct colors for different classes. The hue is multiplied
   * by 0.13 and wrapped to ensure good color distribution.
   *
   * @param classId - Class identifier (0-255).
   * @returns RGB color tuple [r, g, b] with values 0-255.
   */
  private classColor(classId: number): [number, number, number] {
    const hue = (classId * 0.13) % 1;
    const [r, g, b] = this.hsvToRgb(hue, 0.75, 0.95);
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * Converts HSV color to RGB color space.
   *
   * Implements standard HSV to RGB conversion algorithm using the
   * hexagonal color model.
   *
   * @param h - Hue (0-1).
   * @param s - Saturation (0-1).
   * @param v - Value/brightness (0-1).
   * @returns RGB color tuple [r, g, b] with values 0-1.
   */
  private hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const mod = i % 6;
    if (mod === 0) {
      return [v, t, p];
    }
    if (mod === 1) {
      return [q, v, p];
    }
    if (mod === 2) {
      return [p, v, t];
    }
    if (mod === 3) {
      return [p, q, v];
    }
    if (mod === 4) {
      return [t, p, v];
    }
    return [v, p, q];
  }

  /**
   * Updates the mask canvas with temporal smoothing using exponential moving average.
   *
   * Implements temporal mask smoothing by blending the new mask with the previous
   * mask using an alpha value. Uses ping-pong buffering (maskCanvas and maskScratchCanvas)
   * to avoid reading and writing to the same buffer.
   *
   * Behavior:
   * - If no previous mask exists or alpha >= 1: replaces mask completely
   * - If alpha <= 0: keeps previous mask unchanged
   * - Otherwise: blends previous mask (1-alpha) with new mask (alpha)
   *
   * @param mask - New mask ImageBitmap to blend in.
   * @param width - Mask width in pixels (uses mask.width if not provided).
   * @param height - Mask height in pixels (uses mask.height if not provided).
   * @param alpha - Blending factor (0-1) for temporal smoothing. Higher values
   *                make the mask more responsive to changes.
   */
  private updateMaskCanvas(mask: ImageBitmap, width: number, height: number, alpha: number): void {
    const resolvedWidth = width || mask.width;
    const resolvedHeight = height || mask.height;
    this.ensureMaskCanvas(resolvedWidth, resolvedHeight);
    if (!this.maskCanvas || !this.maskCtx) {
      return;
    }
    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    if (!this.hasMask || clampedAlpha >= 1) {
      this.maskCtx.globalAlpha = 1;
      this.maskCtx.clearRect(0, 0, resolvedWidth, resolvedHeight);
      this.maskCtx.drawImage(mask, 0, 0, resolvedWidth, resolvedHeight);
      this.hasMask = true;
      return;
    }
    if (clampedAlpha <= 0) {
      this.hasMask = true;
      return;
    }
    if (!this.maskScratchCanvas || !this.maskScratchCtx) {
      this.maskCtx.globalAlpha = 1;
      this.maskCtx.clearRect(0, 0, resolvedWidth, resolvedHeight);
      this.maskCtx.drawImage(mask, 0, 0, resolvedWidth, resolvedHeight);
      this.hasMask = true;
      return;
    }
    this.maskScratchCtx.globalAlpha = 1 - clampedAlpha;
    this.maskScratchCtx.clearRect(0, 0, resolvedWidth, resolvedHeight);
    this.maskScratchCtx.drawImage(this.maskCanvas, 0, 0, resolvedWidth, resolvedHeight);
    this.maskScratchCtx.globalAlpha = clampedAlpha;
    this.maskScratchCtx.drawImage(mask, 0, 0, resolvedWidth, resolvedHeight);
    this.maskScratchCtx.globalAlpha = 1;
    this.swapMaskBuffers();
    this.hasMask = true;
  }

  /**
   * Renders edge visualization of a mask for debug mode.
   *
   * Extracts edges from the mask using smoothstep functions to create a band-pass
   * filter that highlights mask boundaries. The result is a grayscale image where
   * edges appear as bright regions.
   *
   * Edge detection algorithm:
   * - Uses smoothstep(0.4, 0.6, value) to detect rising edges
   * - Subtracts smoothstep(0.6, 0.8, value) to detect falling edges
   * - Result highlights the transition region (edges) of the mask
   *
   * @param ctx - Canvas2D rendering context for output.
   * @param mask - Mask image source to extract edges from.
   * @param width - Output width in pixels.
   * @param height - Output height in pixels.
   */
  private renderEdgeMask(ctx: CanvasRenderingContext2D, mask: CanvasImageSource, width: number, height: number): void {
    if (!this.maskScratchCanvas || !this.maskScratchCtx || !this.maskCanvas) {
      ctx.drawImage(mask, 0, 0, width, height);
      return;
    }
    const maskWidth = this.maskCanvas.width || width;
    const maskHeight = this.maskCanvas.height || height;
    if (this.maskScratchCanvas.width !== maskWidth || this.maskScratchCanvas.height !== maskHeight) {
      this.maskScratchCanvas.width = maskWidth;
      this.maskScratchCanvas.height = maskHeight;
    }
    this.maskScratchCtx.clearRect(0, 0, maskWidth, maskHeight);
    this.maskScratchCtx.drawImage(mask, 0, 0, maskWidth, maskHeight);
    const imageData = this.maskScratchCtx.getImageData(0, 0, maskWidth, maskHeight);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const value = data[i] / 255;
      const edge = this.smoothstep(0.4, 0.6, value) - this.smoothstep(0.6, 0.8, value);
      const gray = Math.round(edge * 255);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      data[i + 3] = 255;
    }
    this.maskScratchCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(this.maskScratchCanvas, 0, 0, width, height);
  }

  /**
   * Smooth interpolation function (smoothstep) for edge detection.
   *
   * Implements the standard smoothstep function that provides smooth interpolation
   * between 0 and 1 using a cubic Hermite polynomial. Returns 0 for x <= edge0,
   * 1 for x >= edge1, and smoothly interpolates between them.
   *
   * Used for edge detection in renderEdgeMask to create smooth transitions
   * rather than hard thresholds.
   *
   * @param edge0 - Lower edge threshold.
   * @param edge1 - Upper edge threshold.
   * @param x - Input value to interpolate.
   * @returns Interpolated value between 0 and 1.
   */
  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Ensures mask canvas buffers are created and properly sized.
   *
   * Creates maskCanvas and maskScratchCanvas if they don't exist, and resizes
   * them to match the specified dimensions. These canvases are used for temporal
   * mask smoothing with ping-pong buffering.
   *
   * @param width - Required canvas width in pixels.
   * @param height - Required canvas height in pixels.
   */
  private ensureMaskCanvas(width: number, height: number): void {
    if (!this.maskCanvas) {
      this.maskCanvas = document.createElement('canvas');
      this.maskCtx = this.maskCanvas.getContext('2d');
    }
    if (!this.maskScratchCanvas) {
      this.maskScratchCanvas = document.createElement('canvas');
      this.maskScratchCtx = this.maskScratchCanvas.getContext('2d');
    }
    if (this.maskCanvas && (this.maskCanvas.width !== width || this.maskCanvas.height !== height)) {
      this.maskCanvas.width = width;
      this.maskCanvas.height = height;
    }
    if (
      this.maskScratchCanvas &&
      (this.maskScratchCanvas.width !== width || this.maskScratchCanvas.height !== height)
    ) {
      this.maskScratchCanvas.width = width;
      this.maskScratchCanvas.height = height;
    }
  }

  /**
   * Swaps mask canvas buffers for ping-pong rendering.
   *
   * Exchanges maskCanvas with maskScratchCanvas and their associated contexts.
   * Used after blending operations to prepare for the next frame, allowing
   * reading from one buffer while writing to the other.
   */
  private swapMaskBuffers(): void {
    const canvas = this.maskCanvas;
    this.maskCanvas = this.maskScratchCanvas;
    this.maskScratchCanvas = canvas;
    const ctx = this.maskCtx;
    this.maskCtx = this.maskScratchCtx;
    this.maskScratchCtx = ctx;
  }

  /**
   * Stops the pipeline and releases all resources.
   *
   * Closes segmenter, releases background bitmaps, destroys canvases,
   * resets quality controller, and clears all references. Should be called
   * when the pipeline is no longer needed to prevent memory leaks.
   */
  public stop(): void {
    this.background?.bitmap?.close();
    this.background = null;
    this.maskPostProcessor.reset();
    this.segmenter?.close();
    this.segmenter = null;
    this.currentModelPath = null;
    this.qualityController = null;
    this.outputCanvas = null;
    this.canvasCtx = null;
    this.foregroundCanvas = null;
    this.foregroundCtx = null;
    this.debugCanvas = null;
    this.debugCtx = null;
    this.maskCanvas = null;
    this.maskCtx = null;
    this.maskScratchCanvas = null;
    this.maskScratchCtx = null;
    this.hasMask = false;
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
   * the segmenter instance. Skips swap if tier is bypass or if the
   * desired model is already loaded. Uses CPU delegate for Canvas2D pipeline.
   *
   * @param tier - Quality tier
   */
  private async ensureSegmenterForTier(tier: QualityTier): Promise<void> {
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
      delegate: 'CPU',
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
   * Adds a new sample to the metrics window and invokes the onMetrics callback
   * with aggregated metrics. Note that quality controller updates now happen
   * inline in processFrame() when in 'auto' mode, not in this method.
   *
   * Uses 'CPU' as the segmentation delegate since Canvas2D uses CPU inference.
   *
   * @param totalMs - Total frame processing time in milliseconds.
   * @param segmentationMs - Segmentation processing time in milliseconds.
   * @param gpuMs - Rendering time in milliseconds (Canvas2D operations).
   * @param tier - Current quality tier.
   */
  private updateMetrics(totalMs: number, segmentationMs: number, gpuMs: number, tier: QualityTier): void {
    if (!this.onMetrics || !this.getDroppedFrames) {
      return;
    }
    pushMetricsSample(this.metricsWindow, {totalMs, segmentationMs, gpuMs});
    // Canvas2dPipeline uses CPU delegate
    const segmentationDelegate = this.segmenter?.getDelegate?.() ?? 'CPU';
    this.onMetrics(buildMetrics(this.metricsWindow, this.getDroppedFrames(), tier, segmentationDelegate));
  }

  public getCurrentModelPath(): string | null {
    return '';
  }
}
