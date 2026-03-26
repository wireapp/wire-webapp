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

import {backgroundEffectsWorkerState} from './backgroundEffectsWorkerState';

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
import type {QualityTier, QualityTierParams} from '../types';

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
  if (backgroundEffectsWorkerState.fatalError) {
    frame.close();
    return;
  }

  const renderer = backgroundEffectsWorkerState.renderer;
  if (!renderer || backgroundEffectsWorkerState.contextLost) {
    frame.close();
    return;
  }

  let maskInput: MaskInput | null = null;
  let maskBitmap: ImageBitmap | null = null;
  let releaseMaskResources: (() => void) | null = null;
  try {
    if (width !== backgroundEffectsWorkerState.width || height !== backgroundEffectsWorkerState.height) {
      backgroundEffectsWorkerState.width = width;
      backgroundEffectsWorkerState.height = height;
      if (backgroundEffectsWorkerState.canvas) {
        backgroundEffectsWorkerState.canvas.width = width;
        backgroundEffectsWorkerState.canvas.height = height;
      }
    }

    let qualityTier = resolveQualityTierParams();
    if (!qualityTier.bypass) {
      ensureSegmenterForTier(qualityTier.tier);
      if (!backgroundEffectsWorkerState.segmenter) {
        qualityTier = {...qualityTier, bypass: true};
      }
    }
    let segmentationMs = 0;

    if (!qualityTier.bypass && backgroundEffectsWorkerState.segmenter && qualityTier.segmentationCadence > 0) {
      if (backgroundEffectsWorkerState.frameCount % qualityTier.segmentationCadence === 0) {
        backgroundEffectsWorkerState.segmenter.configure(qualityTier.segmentationWidth, qualityTier.segmentationHeight);
        const timestampMs = nextTimestampMs(timestamp);
        const includeClassMask =
          backgroundEffectsWorkerState.debugMode === 'classOverlay' ||
          backgroundEffectsWorkerState.debugMode === 'classOnly';
        const result = await backgroundEffectsWorkerState.segmenter.segment(frame, timestampMs, {includeClassMask});
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

    if (
      backgroundEffectsWorkerState.canvas &&
      (backgroundEffectsWorkerState.canvas.width !== backgroundEffectsWorkerState.width ||
        backgroundEffectsWorkerState.canvas.height !== backgroundEffectsWorkerState.height)
    ) {
      backgroundEffectsWorkerState.canvas.width = backgroundEffectsWorkerState.width;
      backgroundEffectsWorkerState.canvas.height = backgroundEffectsWorkerState.height;
    }

    renderer.configure(
      backgroundEffectsWorkerState.width,
      backgroundEffectsWorkerState.height,
      qualityTier,
      backgroundEffectsWorkerState.mode,
      backgroundEffectsWorkerState.debugMode,
      backgroundEffectsWorkerState.blurStrength,
    );

    if (backgroundEffectsWorkerState.background && backgroundEffectsWorkerState.backgroundSize) {
      renderer.setBackground(
        backgroundEffectsWorkerState.background,
        backgroundEffectsWorkerState.backgroundSize.width,
        backgroundEffectsWorkerState.backgroundSize.height,
      );
    }

    const gpuStart = performance.now();
    try {
      renderer.render(frame, maskInput);
    } finally {
      maskBitmap?.close();
      releaseMaskResources?.();
    }
    const gpuMs = performance.now() - gpuStart;

    backgroundEffectsWorkerState.frameCount += 1;

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
  return resolveQualityTierForEffectMode(
    backgroundEffectsWorkerState.qualityController,
    backgroundEffectsWorkerState.quality,
    backgroundEffectsWorkerState.mode,
  );
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
  if (!backgroundEffectsWorkerState.options || !backgroundEffectsWorkerState.canvas) {
    return;
  }
  if (tier === 'bypass') {
    return;
  }

  const desiredPath = resolveSegmentationModelPath(
    tier,
    backgroundEffectsWorkerState.options.segmentationModelByTier,
    backgroundEffectsWorkerState.options.segmentationModelPath,
  );

  if (backgroundEffectsWorkerState.currentModelPath === desiredPath && backgroundEffectsWorkerState.segmenter) {
    return;
  }
  if (backgroundEffectsWorkerState.pendingModelPath === desiredPath) {
    console.info('[bgfx.worker] Segmentation change for model swap, already in progress');
    return;
  }

  const initId = ++currentInitId;
  backgroundEffectsWorkerState.pendingModelPath = desiredPath;

  const nextSegmenter = new Segmenter(desiredPath, 'GPU', backgroundEffectsWorkerState.canvas as OffscreenCanvas);

  backgroundEffectsWorkerState.segmenterInitPromise = (async () => {
    try {
      console.info('[bgfx.worker] loading model', desiredPath);

      await nextSegmenter.init();

      console.info('[bgfx.worker] model ready', desiredPath);

      backgroundEffectsWorkerState.segmenterErrorCount = 0;
      backgroundEffectsWorkerState.fatalError = null;
    } catch (error) {
      console.warn('[bgfx.worker] Segmentation model swap failed, keeping previous model', error);

      backgroundEffectsWorkerState.segmenterErrorCount++;
      self.postMessage({
        type: 'segmenterError',
        model: desiredPath,
        message: String(error),
      });

      if (backgroundEffectsWorkerState.segmenterErrorCount >= 3) {
        backgroundEffectsWorkerState.fatalError = 'segmenter_failed_repeatedly';

        self.postMessage({
          type: 'workerError',
          reason: 'segmenter',
          message: backgroundEffectsWorkerState.fatalError,
        });
      }
      nextSegmenter.close();
      if (initId === currentInitId) {
        backgroundEffectsWorkerState.pendingModelPath = null;

        if (!backgroundEffectsWorkerState.segmenter) {
          backgroundEffectsWorkerState.segmenter = null;
          backgroundEffectsWorkerState.currentModelPath = null;
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

    backgroundEffectsWorkerState.segmenter?.close();
    backgroundEffectsWorkerState.segmenter = nextSegmenter;
    backgroundEffectsWorkerState.currentModelPath = desiredPath;
    backgroundEffectsWorkerState.pendingModelPath = null;
  })();

  void backgroundEffectsWorkerState.segmenterInitPromise.finally(() => {
    if (initId === currentInitId) {
      backgroundEffectsWorkerState.segmenterInitPromise = null;
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
  if (!backgroundEffectsWorkerState.qualityController) {
    return;
  }

  const processingMode = isProcessingMode(backgroundEffectsWorkerState.mode) ? backgroundEffectsWorkerState.mode : null;
  const params = processingMode
    ? backgroundEffectsWorkerState.quality === 'auto'
      ? backgroundEffectsWorkerState.qualityController.update({totalMs, segmentationMs, gpuMs}, processingMode)
      : backgroundEffectsWorkerState.qualityController.getTier(processingMode)
    : null;

  pushMetricsSample(backgroundEffectsWorkerState.metricsWindow, {totalMs, segmentationMs, gpuMs});
  // Get segmentation delegate type (null if no segmenter)
  const segmentationDelegate = backgroundEffectsWorkerState.segmenter?.getDelegate() ?? null;
  backgroundEffectsWorkerState.metrics = buildMetrics(
    backgroundEffectsWorkerState.metricsWindow,
    backgroundEffectsWorkerState.metrics.droppedFrames,
    backgroundEffectsWorkerState.quality === 'auto' && params ? params.tier : tier,
    segmentationDelegate,
  );

  postMessage({type: 'metrics', metrics: backgroundEffectsWorkerState.metrics});
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
  const monotonic = toMonotonicTimestampMs(sourceTimestampSeconds, backgroundEffectsWorkerState.lastTimestampMs);
  backgroundEffectsWorkerState.lastTimestampMs = monotonic;
  return monotonic;
}
