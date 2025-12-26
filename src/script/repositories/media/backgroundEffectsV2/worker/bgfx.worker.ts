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

import {QualityController} from '../quality/QualityController';
import {WebGLRenderer} from '../renderer/WebGLRenderer';
import {Segmenter} from '../segmentation/segmenter';
import type {
  DebugMode,
  EffectMode,
  Metrics,
  QualityMode,
  QualityTierParams,
  WorkerMessage,
  WorkerOptions,
  WorkerResponse,
} from '../types';

interface State {
  renderer: WebGLRenderer | null;
  segmenter: Segmenter | null;
  qualityController: QualityController | null;
  options: WorkerOptions | null;
  width: number;
  height: number;
  mode: EffectMode;
  debugMode: DebugMode;
  blurStrength: number;
  quality: QualityMode;
  metrics: Metrics;
  frameCount: number;
  lastMask: ImageBitmap | null;
  background: ImageBitmap | null;
  backgroundSize: {width: number; height: number} | null;
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
        state.metrics.droppedFrames += 1;
      } finally {
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

async function handleInit(
  canvas: OffscreenCanvas,
  width: number,
  height: number,
  options: WorkerOptions,
): Promise<void> {
  state.options = options;
  state.width = width;
  state.height = height;
  state.mode = options.mode;
  state.debugMode = options.debugMode;
  state.blurStrength = options.blurStrength;
  state.quality = options.quality;

  const renderer = new WebGLRenderer(canvas, width, height);
  state.renderer = renderer;

  state.qualityController = new QualityController(options.targetFps ?? 30);
  if (state.quality !== 'auto') {
    state.qualityController.setTier(state.quality);
  }

  state.segmenter = new Segmenter(options.segmentationModelPath, 'GPU');
  try {
    await state.segmenter.init();
  } catch (error) {
    console.warn('[bgfx.worker] Segmenter init failed, running in bypass mode.', error);
    postMessage({type: 'segmenterError', error: String(error)} as WorkerResponse);
    state.segmenter = null;
  }
}

async function handleFrame(frame: ImageBitmap, timestamp: number, width: number, height: number): Promise<void> {
  const renderer = state.renderer;
  if (!renderer) {
    frame.close();
    return;
  }

  let mask: ImageBitmap | null = null;
  try {
    if (width !== state.width || height !== state.height) {
      state.width = width;
      state.height = height;
    }

    let qualityTier = resolveQualityTier();
    if (!state.segmenter) {
      qualityTier = {...qualityTier, bypass: true};
    }
    renderer.configure(state.width, state.height, qualityTier, state.mode, state.debugMode, state.blurStrength);

    let segmentationMs = 0;

    if (!qualityTier.bypass && state.segmenter && qualityTier.segmentationCadence > 0) {
      if (state.frameCount % qualityTier.segmentationCadence === 0) {
        state.segmenter.configure(qualityTier.segmentationWidth, qualityTier.segmentationHeight);
        const timestampMs = nextTimestampMs(timestamp);
        const result = await state.segmenter.segment(frame, timestampMs);
        mask = result.mask;
        segmentationMs = result.durationMs;
        state.lastMask?.close();
        state.lastMask = mask;
      } else {
        mask = state.lastMask;
      }
    }

    if (state.background && state.backgroundSize) {
      renderer.setBackground(state.background, state.backgroundSize.width, state.backgroundSize.height);
    }

    const gpuStart = performance.now();
    renderer.render(frame, mask);
    const gpuMs = performance.now() - gpuStart;

    state.frameCount += 1;

    const totalMs = segmentationMs + gpuMs;
    updateMetrics(totalMs, segmentationMs, gpuMs, qualityTier.tier);
  } finally {
    frame.close();
    if (mask && mask !== state.lastMask) {
      mask.close();
    }
  }
}

function resolveQualityTier(): QualityTierParams {
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
      bypass: true,
    };
  }

  if (state.quality !== 'auto') {
    state.qualityController.setTier(state.quality);
    return state.qualityController.getTier();
  }

  return state.qualityController.getTier();
}

function updateMetrics(totalMs: number, segmentationMs: number, gpuMs: number, tier: 'A' | 'B' | 'C' | 'D'): void {
  if (!state.qualityController) {
    return;
  }

  const params =
    state.quality === 'auto'
      ? state.qualityController.update({totalMs, segmentationMs, gpuMs})
      : state.qualityController.getTier();
  const averages = state.qualityController.getAverages();
  state.metrics = {
    avgTotalMs: averages.totalMs,
    avgSegmentationMs: averages.segmentationMs,
    avgGpuMs: averages.gpuMs,
    droppedFrames: state.metrics.droppedFrames,
    tier: state.quality === 'auto' ? params.tier : tier,
  };

  postMessage({type: 'metrics', metrics: state.metrics} as WorkerResponse);
}

function nextTimestampMs(sourceTimestampSeconds: number): number {
  const candidate = Math.floor(sourceTimestampSeconds * 1000);
  const monotonic = Math.max(candidate, state.lastTimestampMs + 1, Math.floor(performance.now()));
  state.lastTimestampMs = monotonic;
  return monotonic;
}

async function handleBackgroundImage(bitmap: ImageBitmap | null, width: number, height: number): Promise<void> {
  if (!bitmap) {
    state.background?.close();
    state.background = null;
    state.backgroundSize = null;
    return;
  }
  state.background?.close();
  state.background = bitmap;
  state.backgroundSize = {width, height};
}

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
