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

import type {
  DebugMode,
  EffectMode,
  Metrics,
  PipelineType,
  QualityMode,
  QualityTier,
  SegmentationModelByTier,
} from '../backgroundEffectsWorkerTypes';
import type {MaskPostProcessorFactory} from '../segmentation/maskPostProcessor';
import type {SegmenterFactory} from '../segmentation/segmenterTypes';

/**
 * Runtime configuration for a pipeline instance.
 *
 * These values can be updated at runtime via updateConfig() without
 * reinitializing the pipeline.
 */
export interface PipelineConfig {
  /** Effect mode ('blur', 'virtual', or 'passthrough'). */
  mode: EffectMode;
  /** Debug visualization mode. */
  debugMode: DebugMode;
  /** Blur strength (0-1) for blur effect mode. */
  blurStrength: number;
  /** Quality mode  */
  quality: QualityMode;
}

/**
 * Initialization parameters for a pipeline instance.
 *
 * All fields are required except for optional factories used for testing.
 * The pipeline uses these values during initialization to set up resources,
 * segmenters, and quality controllers.
 */
export interface PipelineInit {
  /** Output canvas for rendering processed frames. */
  outputCanvas: HTMLCanvasElement;
  /** Target frames per second for adaptive quality control. */
  targetFps: number;
  /** Path to MediaPipe segmentation model file. */
  segmentationModelPath: string;
  /** Per-tier segmentation model path overrides. */
  segmentationModelByTier: SegmentationModelByTier;
  /** Initial quality tier when quality mode is 'auto'. */
  initialTier: QualityTier;
  /** Runtime configuration for the pipeline. */
  config: PipelineConfig;
  /** Optional factory for creating segmenter instances (for testing). */
  createSegmenter?: SegmenterFactory;
  /** Optional factory for creating mask post-processors (for testing). */
  createMaskPostProcessor?: MaskPostProcessorFactory;
  /** Optional callback to receive performance metrics updates. */
  onMetrics: ((metrics: Metrics) => void) | null;
  /** Callback invoked when quality tier changes (adaptive quality mode). */
  onTierChange: (tier: QualityTier) => void;
  /** Callback invoked when a frame is dropped, returns dropped frame count. */
  onDroppedFrame: () => number;
  /** Function that returns the current dropped frame count. */
  getDroppedFrames: () => number;
  /** Optional callback invoked when worker segmenter initialization fails. */
  onWorkerSegmenterError?: (error: string) => void;
  /** Optional callback invoked when worker WebGL context is lost. */
  onWorkerContextLoss?: () => void;
  maxTier: QualityTier | null;
}

/**
 * Interface for background effects rendering pipelines.
 *
 * Pipelines process video frames through segmentation and rendering stages
 * to produce output frames with background effects applied. Different pipeline
 * implementations use different rendering backends (WebGL2, Canvas2D, Worker)
 * and have different performance characteristics.
 *
 * All pipelines must implement this interface to be used by BackgroundEffectsController.
 */
export interface BackgroundEffectsRenderingPipeline {
  /** BackgroundEffectsRenderingPipeline type identifier. */
  readonly type: PipelineType;
  /**
   * Initializes the pipeline with configuration and resources.
   *
   * Sets up rendering contexts, segmenters, quality controllers, and other
   * resources needed for frame processing. Must be called before processFrame().
   *
   * @param init - BackgroundEffectsRenderingPipeline initialization parameters.
   * @returns Promise that resolves when initialization is complete.
   */
  init(init: PipelineInit): Promise<void>;
  /**
   * Processes a single video frame through the pipeline.
   *
   * Performs segmentation (if cadence allows), applies mask post-processing,
   * and renders the frame with background effects applied to the output canvas.
   *
   * @param frame - Input video frame as ImageBitmap (will be closed after processing).
   * @param timestamp - Frame timestamp in seconds.
   * @param width - Frame width in pixels.
   * @param height - Frame height in pixels.
   * @returns Promise that resolves when frame processing is complete.
   */
  processFrame(frame: ImageBitmap, timestamp: number, width: number, height: number): Promise<void>;
  /**
   * Updates runtime configuration without reinitializing.
   *
   * Updates effect mode, debug mode, blur strength, and quality settings.
   * Some pipelines may need to update internal state (e.g., quality controller tier).
   *
   * @param config - New pipeline configuration.
   */
  updateConfig(config: PipelineConfig): void;
  /**
   * Sets a static background image for virtual background mode.
   *
   * The bitmap is stored and used for all subsequent frames until cleared
   * or replaced. For worker pipelines, the bitmap is transferred (not cloned).
   *
   * @param bitmap - Background image as ImageBitmap.
   * @param width - Image width in pixels.
   * @param height - Image height in pixels.
   */
  setBackgroundImage(bitmap: ImageBitmap, width: number, height: number): void;
  /**
   * Sets a video frame as background for virtual background mode.
   *
   * Similar to setBackgroundImage but intended for video backgrounds that
   * update each frame. The bitmap is stored and used for subsequent frames.
   *
   * @param bitmap - Background video frame as ImageBitmap.
   * @param width - Frame width in pixels.
   * @param height - Frame height in pixels.
   */
  setBackgroundVideoFrame(bitmap: ImageBitmap, width: number, height: number): void;
  /**
   * Clears the background source.
   *
   * Releases any stored background image/video and resets background state.
   */
  clearBackground(): void;
  /**
   * Notifies the pipeline of dropped frames for metrics tracking.
   *
   * Used by worker pipelines to sync dropped frame counts from main thread.
   * Main-thread pipelines may ignore this (no-op).
   *
   * @param count - Number of dropped frames.
   */
  notifyDroppedFrames(count: number): void;
  /**
   * Returns whether the output canvas has been transferred to a worker.
   *
   * Used by BackgroundEffectsController to determine if canvas resizing
   * should be skipped (transferred canvases cannot be resized from main thread).
   *
   * @returns True if canvas is transferred to worker, false otherwise.
   */
  isOutputCanvasTransferred(): boolean;
  /**
   * Stops the pipeline and releases all resources.
   *
   * Closes segmenters, destroys renderers, releases background sources,
   * and clears all references. Should be called when the pipeline is no
   * longer needed to prevent memory leaks.
   */
  stop(): void;

  getCurrentModelPath(): string | null;
}
