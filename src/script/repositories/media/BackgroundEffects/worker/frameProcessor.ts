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

import {buildMaskInput, MaskInput} from '../shared/mask';
import {buildMetrics, pushMetricsSample} from '../shared/metrics';
import {getQualityMode, resolveQualityTier} from '../shared/quality';
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
    if (!state.segmenter) {
      qualityTier = {...qualityTier, bypass: true};
    }
    let segmentationMs = 0;

    if (!qualityTier.bypass && state.segmenter && qualityTier.segmentationCadence > 0) {
      if (state.frameCount % qualityTier.segmentationCadence === 0) {
        state.segmenter.configure(qualityTier.segmentationWidth, qualityTier.segmentationHeight);
        const timestampMs = nextTimestampMs(timestamp);
        const result = await state.segmenter.segment(frame, timestampMs);
        const maskResult = buildMaskInput(result);
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

function updateMetrics(totalMs: number, segmentationMs: number, gpuMs: number, tier: 'A' | 'B' | 'C' | 'D'): void {
  if (!state.qualityController) {
    return;
  }

  const params =
    state.quality === 'auto'
      ? state.qualityController.update({totalMs, segmentationMs, gpuMs}, getQualityMode(state.mode))
      : state.qualityController.getTier(getQualityMode(state.mode));

  pushMetricsSample(state.metricsSamples, METRICS_MAX_SAMPLES, {totalMs, segmentationMs, gpuMs});
  state.metrics = buildMetrics(
    state.metricsSamples,
    state.metrics.droppedFrames,
    state.quality === 'auto' ? params.tier : tier,
  );

  postMessage({type: 'metrics', metrics: state.metrics});
}

function nextTimestampMs(sourceTimestampSeconds: number): number {
  const monotonic = toMonotonicTimestampMs(sourceTimestampSeconds, state.lastTimestampMs);
  state.lastTimestampMs = monotonic;
  return monotonic;
}
