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

import {state} from './backgroundEffectsWorkerState';

import type {QualityTier, QualityTierParams} from '../backgroundEffectsWorkerTypes';
import {
  buildMetrics,
  isProcessingMode,
  pushMetricsSample,
  resolveQualityTierForEffectMode,
  resolveSegmentationModelPath,
} from '../quality';
import {Segmenter} from '../segmentation/segmenter';
import {buildMaskInput, type MaskInput, type MaskSource} from '../shared/mask';
import {toMonotonicTimestampMs} from '../shared/timestamps';

/**
 * Processes a single video frame in the worker thread.
 *
 * Performs the complete frame processing pipeline:
 * 1. Updates canvas dimensions if frame size changed
 * 2. Resolves quality tier and ensures segmenter is configured
 * 3. Performs segmentation (if cadence allows)
 * 4. Configures renderer with current settings
 * 5. Renders frame with effects applied
 * 6. Updates performance metrics
 *
 * Handles context loss by checking state.contextLost and skipping processing.
 * Always closes the input frame to prevent memory leaks.
 *
 * @param frame - Input video frame as ImageBitmap (will be closed).
 * @param timestamp - Frame timestamp in seconds.
 * @param width - Frame width in pixels.
 * @param height - Frame height in pixels.
 * @returns Promise that resolves when frame processing is complete.
 */
export async function handleFrame(frame: ImageBitmap, timestamp: number, width: number, height: number): Promise<void> {
  if (state.fatalError) {
    frame.close();
    return;
  }

  const renderer = state.renderer;
  if (!renderer || state.contextLost) {
    frame.close();
    return;
  }

  let maskInput: MaskInput | null = null;
  let maskBitmap: ImageBitmap | null = null;
  let releaseMaskResources: (() => void) | null = null;
  try {
    if (width !== state.width || height !== state.height) {
      state.width = width;
      state.height = height;
      if (state.canvas) {
        state.canvas.width = width;
        state.canvas.height = height;
      }
    }

    let qualityTier = resolveQualityTierParams();
    if (!qualityTier.bypass) {
      ensureSegmenterForTier(qualityTier.tier);
      if (!state.segmenter) {
        qualityTier = {...qualityTier, bypass: true};
      }
    }
    let segmentationMs = 0;

    if (!qualityTier.bypass && state.segmenter && qualityTier.segmentationCadence > 0) {
      if (state.frameCount % qualityTier.segmentationCadence === 0) {
        state.segmenter.configure(qualityTier.segmentationWidth, qualityTier.segmentationHeight);
        const timestampMs = nextTimestampMs(timestamp);
        const includeClassMask = state.debugMode === 'classOverlay' || state.debugMode === 'classOnly';
        const result = await state.segmenter.segment(frame, timestampMs, {includeClassMask});
        const useClassMask = includeClassMask && result.classMask;
        const maskSource: MaskSource = useClassMask
          ? {
              mask: result.classMask,
              maskTexture: null,
              width: result.width,
              height: result.height,
              release: result.release,
            }
          : result;
        if (useClassMask) {
          result.mask?.close();
        } else {
          result.classMask?.close();
        }
        const maskResult = buildMaskInput(maskSource);
        releaseMaskResources = maskResult.release;
        maskInput = maskResult.maskInput;
        maskBitmap = maskResult.maskBitmap;
        segmentationMs = result.durationMs;
      }
    }

    if (state.canvas && (state.canvas.width !== state.width || state.canvas.height !== state.height)) {
      state.canvas.width = state.width;
      state.canvas.height = state.height;
    }

    renderer.configure(state.width, state.height, qualityTier, state.mode, state.debugMode, state.blurStrength);

    if (state.background && state.backgroundSize) {
      renderer.setBackground(state.background, state.backgroundSize.width, state.backgroundSize.height);
    }

    const gpuStart = performance.now();
    try {
      renderer.render(frame, maskInput);
    } finally {
      maskBitmap?.close();
      releaseMaskResources?.();
    }
    const gpuMs = performance.now() - gpuStart;

    state.frameCount += 1;

    const totalMs = segmentationMs + gpuMs;
    updateMetrics(totalMs, segmentationMs, gpuMs, qualityTier.tier);
  } finally {
    frame.close();
  }
}

/**
 * Resolves quality tier parameters for the current configuration.
 *
 * Delegates to resolveQualityTierForEffectMode with the current quality
 * controller, quality mode, and effect mode from worker state.
 *
 * @returns Quality tier parameters for current configuration.
 */
function resolveQualityTierParams(): QualityTierParams {
  return resolveQualityTierForEffectMode(state.qualityController, state.quality, state.mode);
}

/**
 * Ensures the segmenter is initialized for the specified quality tier.
 *
 * If the tier requires a different model than currently loaded, initiates
 * an asynchronous segmenter swap. Skips if tier is 'D' (bypass), if a swap
 * is already in progress, or if the desired model is already loaded.
 *
 * Uses GPU delegate for worker pipeline. The swap happens asynchronously
 * to avoid blocking frame processing.
 *
 * @param tier - Quality tier ('superhigh', 'high', 'medium', or 'low', or ''bypass).
 * @returns Nothing.
 */
let currentInitId = 0;

function ensureSegmenterForTier(tier: QualityTier): void {
  if (!state.options || !state.canvas) {
    return;
  }
  if (tier === 'bypass') {
    return;
  }

  const desiredPath = resolveSegmentationModelPath(
    tier,
    state.options.segmentationModelByTier,
    state.options.segmentationModelPath,
  );

  if (state.currentModelPath === desiredPath && state.segmenter) {
    return;
  }
  if (state.pendingModelPath === desiredPath) {
    console.info('[bgfx.worker] Segmentation change for model swap, already in progress');
    return;
  }

  const initId = ++currentInitId;
  state.pendingModelPath = desiredPath;

  const nextSegmenter = new Segmenter(desiredPath, 'GPU', state.canvas as OffscreenCanvas);

  state.segmenterInitPromise = (async () => {
    try {
      console.info('[bgfx.worker] loading model', desiredPath);

      await nextSegmenter.init();

      console.info('[bgfx.worker] model ready', desiredPath);

      state.segmenterErrorCount = 0;
      state.fatalError = null;
    } catch (error) {
      console.warn('[bgfx.worker] Segmentation model swap failed, keeping previous model', error);

      state.segmenterErrorCount++;
      self.postMessage({
        type: 'segmenterError',
        model: desiredPath,
        message: String(error),
      });

      if (state.segmenterErrorCount >= 3) {
        state.fatalError = 'segmenter_failed_repeatedly';

        self.postMessage({
          type: 'workerError',
          reason: 'segmenter',
          message: state.fatalError,
        });
      }
      nextSegmenter.close();
      if (initId === currentInitId) {
        state.pendingModelPath = null;
        state.lastTimestampMs = 0;

        if (!state.segmenter) {
          state.segmenter = null;
          state.currentModelPath = null;
        }
      }
      return;
    }

    // In case meanwhile a new init process stated again we discard this segmenter
    if (initId !== currentInitId) {
      console.warn('[bgfx.worker] Segmentation model swap again, we use next segmenter and discard previous one');
      nextSegmenter.close();
      return;
    }

    state.segmenter?.close();
    state.segmenter = nextSegmenter;
    state.currentModelPath = desiredPath;
    state.pendingModelPath = null;
    state.lastTimestampMs = 0;
  })();

  void state.segmenterInitPromise.finally(() => {
    if (initId === currentInitId) {
      state.segmenterInitPromise = null;
    }
  });
}

/**
 * Updates performance metrics and sends them to the main thread.
 *
 * Updates the quality controller if in 'auto' mode, pushes metrics sample
 * to the metrics window, builds aggregated metrics, and posts them to
 * the main thread via postMessage.
 *
 * @param totalMs - Total frame processing time in milliseconds.
 * @param segmentationMs - Segmentation processing time in milliseconds.
 * @param gpuMs - GPU rendering time in milliseconds.
 * @param tier - Current quality tier.
 * @returns Nothing.
 */
function updateMetrics(totalMs: number, segmentationMs: number, gpuMs: number, tier: QualityTier): void {
  if (!state.qualityController) {
    return;
  }

  const processingMode = isProcessingMode(state.mode) ? state.mode : null;
  const params = processingMode
    ? state.quality === 'auto'
      ? state.qualityController.update({totalMs, segmentationMs, gpuMs}, processingMode)
      : state.qualityController.getTier(processingMode)
    : null;

  pushMetricsSample(state.metricsWindow, {totalMs, segmentationMs, gpuMs});
  // Get segmentation delegate type (null if no segmenter)
  const segmentationDelegate = state.segmenter?.getDelegate() ?? null;
  state.metrics = buildMetrics(
    state.metricsWindow,
    state.metrics.droppedFrames,
    state.quality === 'auto' && params ? params.tier : tier,
    segmentationDelegate,
  );

  postMessage({type: 'metrics', metrics: state.metrics});
}

/**
 * Converts frame timestamp to monotonic milliseconds.
 *
 * Ensures timestamps are strictly increasing and never in the past by
 * using toMonotonicTimestampMs. Updates state.lastTimestampMs with the
 * result for the next frame.
 *
 * @param sourceTimestampSeconds - Frame timestamp in seconds.
 * @returns Monotonic timestamp in milliseconds.
 */
function nextTimestampMs(sourceTimestampSeconds: number): number {
  const monotonic = toMonotonicTimestampMs(sourceTimestampSeconds, state.lastTimestampMs);
  state.lastTimestampMs = monotonic;
  return monotonic;
}
