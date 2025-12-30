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

import {METRICS_MAX_SAMPLES, state} from './state';

import {
  buildMetrics,
  getQualityMode,
  pushMetricsSample,
  resolveQualityTier,
  resolveSegmentationModelPath,
} from '../quality';
import {Segmenter} from '../segmentation/segmenter';
import {buildMaskInput, MaskInput} from '../shared/mask';
import {toMonotonicTimestampMs} from '../shared/timestamps';
import type {QualityTierParams} from '../types';

export async function handleFrame(frame: ImageBitmap, timestamp: number, width: number, height: number): Promise<void> {
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
    ensureSegmenterForTier(qualityTier.tier);
    if (!state.segmenter) {
      qualityTier = {...qualityTier, bypass: true};
    }
    let segmentationMs = 0;

    if (!qualityTier.bypass && state.segmenter && qualityTier.segmentationCadence > 0) {
      if (state.frameCount % qualityTier.segmentationCadence === 0) {
        state.segmenter.configure(qualityTier.segmentationWidth, qualityTier.segmentationHeight);
        const timestampMs = nextTimestampMs(timestamp);
        const includeClassMask = state.debugMode === 'classOverlay' || state.debugMode === 'classOnly';
        const result = await state.segmenter.segment(frame, timestampMs, {includeClassMask});
        const useClassMask = includeClassMask && result.classMask;
        const maskSource = useClassMask
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

function resolveQualityTierParams(): QualityTierParams {
  return resolveQualityTier(state.qualityController, state.quality, getQualityMode(state.mode));
}

function ensureSegmenterForTier(tier: 'A' | 'B' | 'C' | 'D'): void {
  if (!state.options || !state.canvas) {
    return;
  }
  if (state.segmenterInitPromise) {
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
  state.segmenterInitPromise = (async () => {
    const nextSegmenter = new Segmenter(desiredPath, 'GPU', state.canvas as OffscreenCanvas);
    try {
      await nextSegmenter.init();
    } catch (error) {
      console.warn('[bgfx.worker] Segmentation model swap failed, keeping previous model', error);
      nextSegmenter.close();
      return;
    }
    state.segmenter?.close();
    state.segmenter = nextSegmenter;
    state.currentModelPath = desiredPath;
  })();
  void state.segmenterInitPromise.finally(() => {
    state.segmenterInitPromise = null;
  });
}

function updateMetrics(totalMs: number, segmentationMs: number, gpuMs: number, tier: 'A' | 'B' | 'C' | 'D'): void {
  if (!state.qualityController) {
    return;
  }

  const params =
    state.quality === 'auto'
      ? state.qualityController.update({totalMs, segmentationMs, gpuMs}, getQualityMode(state.mode))
      : state.qualityController.getTier(getQualityMode(state.mode));

  pushMetricsSample(state.metricsSamples, METRICS_MAX_SAMPLES, {totalMs, segmentationMs, gpuMs});
  // Get segmentation delegate type (null if no segmenter)
  const segmentationDelegate = state.segmenter?.getDelegate() ?? null;
  state.metrics = buildMetrics(
    state.metricsSamples,
    state.metrics.droppedFrames,
    state.quality === 'auto' ? params.tier : tier,
    segmentationDelegate,
  );

  postMessage({type: 'metrics', metrics: state.metrics});
}

function nextTimestampMs(sourceTimestampSeconds: number): number {
  const monotonic = toMonotonicTimestampMs(sourceTimestampSeconds, state.lastTimestampMs);
  state.lastTimestampMs = monotonic;
  return monotonic;
}
