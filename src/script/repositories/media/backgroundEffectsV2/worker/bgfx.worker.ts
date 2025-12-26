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
 * Background Effects Web Worker
 *
 * This Web Worker processes video frames in a background thread to avoid blocking
 * the main thread. It handles:
 * - ML-based person segmentation (MediaPipe Selfie Segmentation)
 * - GPU-accelerated rendering (WebGL2 via OffscreenCanvas)
 * - Adaptive quality control
 * - Background blur and virtual background effects
 *
 * Communication with the main thread is via postMessage/onmessage using
 * structured cloneable types (ImageBitmap, OffscreenCanvas).
 */

import {QualityController} from '../quality/QualityController';
import {WebGLRenderer} from '../renderer/WebGLRenderer';
import {Segmenter} from '../segmentation/segmenter';
import type {
  DebugMode,
  EffectMode,
  Metrics,
  Mode,
  QualityMode,
  QualityTierParams,
  WorkerMessage,
  WorkerOptions,
  WorkerResponse,
} from '../types';

/**
 * Worker state maintained across message handlers.
 * All rendering and processing state is stored here to avoid global variables.
 */
interface State {
  /** WebGL renderer instance for GPU-accelerated compositing. */
  renderer: WebGLRenderer | null;
  /** ML segmenter instance for person/background separation. */
  segmenter: Segmenter | null;
  /** Quality controller for adaptive performance tuning. */
  qualityController: QualityController | null;
  /** Initialization options passed from main thread. */
  options: WorkerOptions | null;
  /** Current output canvas width in pixels. */
  width: number;
  /** Current output canvas height in pixels. */
  height: number;
  /** Current effect mode ('blur', 'virtual', or 'passthrough'). */
  mode: EffectMode;
  /** Current debug visualization mode. */
  debugMode: DebugMode;
  /** Blur strength (0-1) for blur effect mode. */
  blurStrength: number;
  /** Quality mode ('auto' for adaptive, or 'A'/'B'/'C'/'D' for fixed tier). */
  quality: QualityMode;
  /** Performance metrics tracked for adaptive quality and monitoring. */
  metrics: Metrics;
  /** Frame counter used for segmentation cadence (process every Nth frame). */
  frameCount: number;
  /** Last computed segmentation mask, reused when cadence > 1. */
  lastMask: ImageBitmap | null;
  /** Background image/video bitmap for virtual background mode. */
  background: ImageBitmap | null;
  /** Dimensions of the background image/video. */
  backgroundSize: {width: number; height: number} | null;
  /** Last processed timestamp in milliseconds, used for monotonic timestamp generation. */
  lastTimestampMs: number;
}

const state: State = {
  renderer: null,
  segmenter: null,
  qualityController: null,
  options: null,
  width: 0,
  height: 0,
  mode: 'blur',
  debugMode: 'off',
  blurStrength: 0.5,
  quality: 'auto',
  metrics: {
    avgTotalMs: 0,
    avgSegmentationMs: 0,
    avgGpuMs: 0,
    droppedFrames: 0,
    tier: 'A',
  },
  frameCount: 0,
  lastMask: null,
  background: null,
  backgroundSize: null,
  lastTimestampMs: 0,
};

/**
 * Main message handler for worker communication.
 *
 * Handles all message types from the main thread:
 * - 'init': Initialize renderer, segmenter, and quality controller
 * - 'frame': Process a video frame (segmentation + rendering)
 * - 'setMode': Update effect mode (blur/virtual/passthrough)
 * - 'setBlurStrength': Update blur strength parameter
 * - 'setDebugMode': Update debug visualization mode
 * - 'setQuality': Update quality mode (auto or fixed tier)
 * - 'setDroppedFrames': Update dropped frame counter
 * - 'setBackgroundImage': Set background image for virtual background
 * - 'setBackgroundVideo': Set background video for virtual background
 * - 'stop': Clean up resources and terminate
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  switch (message.type) {
    case 'init':
      await handleInit(message.canvas, message.width, message.height, message.options);
      postMessage({type: 'ready'} as WorkerResponse);
      break;
    case 'frame':
      try {
        await handleFrame(message.frame, message.timestamp, message.width, message.height);
      } catch {
        // Increment dropped frame counter on processing errors
        state.metrics.droppedFrames += 1;
      } finally {
        // Always notify main thread that frame processing completed
        postMessage({type: 'frameProcessed'} as WorkerResponse);
      }
      break;
    case 'setMode':
      state.mode = message.mode ?? state.mode;
      break;
    case 'setBlurStrength':
      state.blurStrength = message.blurStrength ?? state.blurStrength;
      break;
    case 'setDebugMode':
      state.debugMode = message.debugMode ?? state.debugMode;
      break;
    case 'setQuality':
      state.quality = message.quality ?? state.quality;
      // If quality is fixed (not auto), update quality controller tier
      if (state.quality !== 'auto' && state.qualityController) {
        state.qualityController.setTier(state.quality);
      }
      break;
    case 'setDroppedFrames':
      if (typeof message.droppedFrames === 'number') {
        state.metrics.droppedFrames = message.droppedFrames;
      }
      break;
    case 'setBackgroundImage':
      await handleBackgroundImage(message.image ?? null, message.width ?? 0, message.height ?? 0);
      break;
    case 'setBackgroundVideo':
      await handleBackgroundImage(message.video ?? null, message.width ?? 0, message.height ?? 0);
      break;
    case 'stop':
      cleanup();
      break;
    default:
      break;
  }
};

/**
 * Initializes the worker with renderer, segmenter, and quality controller.
 *
 * This function is called once when the worker receives the 'init' message.
 * It sets up all the components needed for frame processing:
 * - WebGL renderer for GPU-accelerated compositing
 * - Quality controller for adaptive performance tuning
 * - ML segmenter for person/background separation
 *
 * If segmenter initialization fails, the worker continues in bypass mode
 * (no segmentation, passes through original frames).
 *
 * @param canvas - OffscreenCanvas for WebGL rendering (transferred from main thread).
 * @param width - Initial canvas width in pixels.
 * @param height - Initial canvas height in pixels.
 * @param options - Configuration options from main thread.
 */
async function handleInit(
  canvas: OffscreenCanvas,
  width: number,
  height: number,
  options: WorkerOptions,
): Promise<void> {
  // Store initialization state
  state.options = options;
  state.width = width;
  state.height = height;
  state.mode = options.mode;
  state.debugMode = options.debugMode;
  state.blurStrength = options.blurStrength;
  state.quality = options.quality;

  // Initialize WebGL renderer with OffscreenCanvas
  const renderer = new WebGLRenderer(canvas, width, height);
  state.renderer = renderer;

  // Initialize quality controller with target FPS
  state.qualityController = new QualityController(options.targetFps ?? 30);
  // If quality is fixed (not auto), set the tier immediately
  if (state.quality !== 'auto') {
    state.qualityController.setTier(state.quality);
  }

  // Initialize ML segmenter (GPU-accelerated)
  state.segmenter = new Segmenter(options.segmentationModelPath, 'GPU');
  try {
    await state.segmenter.init();
  } catch (error) {
    // Segmenter init failure is non-fatal - continue in bypass mode
    console.warn('[bgfx.worker] Segmenter init failed, running in bypass mode.', error);
    postMessage({type: 'segmenterError', error: String(error)} as WorkerResponse);
    state.segmenter = null;
  }
}

/**
 * Processes a single video frame through the background effects pipeline.
 *
 * Processing steps:
 * 1. Update canvas dimensions if changed
 * 2. Resolve quality tier (adaptive or fixed)
 * 3. Configure renderer with current settings
 * 4. Run segmentation (if not bypassed and cadence allows)
 * 5. Set background image/video (for virtual background mode)
 * 6. Render frame with effects applied
 * 7. Update performance metrics
 *
 * Segmentation cadence: Only processes segmentation every Nth frame based on
 * quality tier. Intermediate frames reuse the last computed mask.
 *
 * @param frame - Video frame as ImageBitmap (transferred from main thread).
 * @param timestamp - Frame timestamp in seconds from video source.
 * @param width - Frame width in pixels.
 * @param height - Frame height in pixels.
 */
async function handleFrame(frame: ImageBitmap, timestamp: number, width: number, height: number): Promise<void> {
  const renderer = state.renderer;
  if (!renderer) {
    frame.close();
    return;
  }

  let mask: ImageBitmap | null = null;
  try {
    // Update dimensions if frame size changed
    if (width !== state.width || height !== state.height) {
      state.width = width;
      state.height = height;
    }

    // Resolve quality tier (adaptive or fixed)
    let qualityTier = resolveQualityTier();
    // Force bypass if segmenter is unavailable
    if (!state.segmenter) {
      qualityTier = {...qualityTier, bypass: true};
    }
    // Configure renderer with current settings
    renderer.configure(state.width, state.height, qualityTier, state.mode, state.debugMode, state.blurStrength);

    let segmentationMs = 0;

    // Run segmentation if not bypassed and cadence allows
    if (!qualityTier.bypass && state.segmenter && qualityTier.segmentationCadence > 0) {
      // Check if we should process segmentation this frame (cadence-based)
      if (state.frameCount % qualityTier.segmentationCadence === 0) {
        // Configure segmenter with quality tier resolution
        state.segmenter.configure(qualityTier.segmentationWidth, qualityTier.segmentationHeight);
        // Generate monotonic timestamp for segmenter
        const timestampMs = nextTimestampMs(timestamp);
        // Run segmentation
        const result = await state.segmenter.segment(frame, timestampMs);
        mask = result.mask;
        segmentationMs = result.durationMs;
        // Store mask for reuse in subsequent frames
        state.lastMask?.close();
        state.lastMask = mask;
      } else {
        // Reuse last computed mask (cadence > 1)
        mask = state.lastMask;
      }
    }

    // Set background image/video for virtual background mode
    if (state.background && state.backgroundSize) {
      renderer.setBackground(state.background, state.backgroundSize.width, state.backgroundSize.height);
    }

    // Render frame with effects applied
    const gpuStart = performance.now();
    renderer.render(frame, mask);
    const gpuMs = performance.now() - gpuStart;

    state.frameCount += 1;

    // Update performance metrics for adaptive quality
    const totalMs = segmentationMs + gpuMs;
    updateMetrics(totalMs, segmentationMs, gpuMs, qualityTier.tier);
  } finally {
    // Always close frame to prevent memory leaks
    frame.close();
    // Close mask if it's not the cached one
    if (mask && mask !== state.lastMask) {
      mask.close();
    }
  }
}

/**
 * Resolves the current quality tier parameters.
 *
 * Returns quality tier based on:
 * - Fixed quality mode: Uses the specified tier ('A', 'B', 'C', or 'D')
 * - Auto quality mode: Uses adaptive tier from quality controller
 * - Fallback: Returns bypass tier (D) if quality controller unavailable
 *
 * @returns Quality tier parameters for rendering configuration.
 */
function resolveQualityTier(): QualityTierParams {
  // Fallback to bypass tier if quality controller unavailable
  if (!state.qualityController) {
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
      softLow: 0.3,
      softHigh: 0.65,
      matteLow: 0.45,
      matteHigh: 0.6,
      matteHysteresis: 0.04,
      bypass: true,
    };
  }

  // Fixed quality mode: set tier explicitly
  if (state.quality !== 'auto') {
    state.qualityController.setTier(state.quality);
    return state.qualityController.getTier(getQualityMode());
  }

  // Auto quality mode: get current adaptive tier
  return state.qualityController.getTier(getQualityMode());
}

/**
 * Updates performance metrics and sends them to the main thread.
 *
 * In auto quality mode, this also triggers adaptive quality tier updates
 * based on measured performance. Metrics are sent to the main thread for
 * monitoring and logging.
 *
 * @param totalMs - Total frame processing time (segmentation + GPU rendering).
 * @param segmentationMs - Time spent on ML segmentation.
 * @param gpuMs - Time spent on GPU rendering operations.
 * @param tier - Current quality tier (used for fixed quality mode).
 */
function updateMetrics(totalMs: number, segmentationMs: number, gpuMs: number, tier: 'A' | 'B' | 'C' | 'D'): void {
  if (!state.qualityController) {
    return;
  }

  // Update quality controller (adaptive mode) or get current tier (fixed mode)
  const params =
    state.quality === 'auto'
      ? state.qualityController.update({totalMs, segmentationMs, gpuMs}, getQualityMode())
      : state.qualityController.getTier(getQualityMode());
  // Get averaged metrics from quality controller
  const averages = state.qualityController.getAverages();
  // Update state metrics
  state.metrics = {
    avgTotalMs: averages.totalMs,
    avgSegmentationMs: averages.segmentationMs,
    avgGpuMs: averages.gpuMs,
    droppedFrames: state.metrics.droppedFrames,
    // Use adaptive tier in auto mode, or provided tier in fixed mode
    tier: state.quality === 'auto' ? params.tier : tier,
  };

  // Send metrics to main thread for monitoring
  postMessage({type: 'metrics', metrics: state.metrics} as WorkerResponse);
}

/**
 * Converts effect mode to quality mode.
 *
 * Quality controller uses 'blur' or 'virtual' modes, while effect mode
 * can also be 'passthrough' (which maps to 'blur' for quality purposes).
 *
 * @returns Quality mode ('blur' or 'virtual').
 */
function getQualityMode(): Mode {
  return state.mode === 'virtual' ? 'virtual' : 'blur';
}

/**
 * Generates a monotonic timestamp in milliseconds from a source timestamp.
 *
 * Ensures timestamps are always increasing, even if the source timestamp
 * goes backwards or has gaps. Uses performance.now() as a lower bound to
 * prevent timestamps from being too far in the past.
 *
 * @param sourceTimestampSeconds - Source timestamp in seconds.
 * @returns Monotonic timestamp in milliseconds.
 */
function nextTimestampMs(sourceTimestampSeconds: number): number {
  const candidate = Math.floor(sourceTimestampSeconds * 1000);
  // Ensure monotonic: must be >= last timestamp + 1, and >= current time
  const monotonic = Math.max(candidate, state.lastTimestampMs + 1, Math.floor(performance.now()));
  state.lastTimestampMs = monotonic;
  return monotonic;
}

/**
 * Updates the background image/video for virtual background mode.
 *
 * Closes the previous background bitmap before setting the new one to
 * prevent memory leaks. If bitmap is null, clears the background.
 *
 * @param bitmap - Background image/video as ImageBitmap, or null to clear.
 * @param width - Background width in pixels.
 * @param height - Background height in pixels.
 */
async function handleBackgroundImage(bitmap: ImageBitmap | null, width: number, height: number): Promise<void> {
  if (!bitmap) {
    // Clear background
    state.background?.close();
    state.background = null;
    state.backgroundSize = null;
    return;
  }
  // Replace background (close old one first)
  state.background?.close();
  state.background = bitmap;
  state.backgroundSize = {width, height};
}

/**
 * Cleans up all resources and resets state.
 *
 * Called when the worker receives a 'stop' message. Closes all ImageBitmaps,
 * destroys the renderer, and closes the segmenter to free GPU and memory resources.
 */
function cleanup(): void {
  state.segmenter?.close();
  state.segmenter = null;
  state.renderer?.destroy();
  state.renderer = null;
  state.lastMask?.close();
  state.lastMask = null;
  state.background?.close();
  state.background = null;
}
