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

import type {DebugMode, EffectMode, Metrics, QualityMode, WorkerOptions} from '../backgroundEffectsWorkerTypes';
import {createMetricsWindow, type MetricsWindow, QualityController} from '../quality';
import {WebGlRenderer} from '../renderer/webGlRenderer';
import {Segmenter} from '../segmentation/segmenter';

/**
 * Global state for the background effects worker.
 *
 * Maintains all state needed for frame processing, including renderer,
 * segmenter, quality controller, configuration, and metrics.
 */
export interface BackgroundEffectsWorkerState {
  renderer: WebGlRenderer | null;
  segmenter: Segmenter | null;
  qualityController: QualityController | null;
  options: WorkerOptions | null;
  width: number;
  height: number;
  mode: EffectMode;
  debugMode: DebugMode;
  blurStrength: number;
  quality: QualityMode;
  currentModelPath: string | null;
  pendingModelPath: string | null;
  segmenterInitPromise: Promise<void> | null;
  metrics: Metrics;
  frameCount: number;
  background: ImageBitmap | null;
  backgroundSize: {width: number; height: number} | null;
  lastTimestampMs: number;
  metricsWindow: MetricsWindow;
  canvas: OffscreenCanvas | null;
  /** Whether the WebGL context has been lost. */
  contextLost: boolean;
  segmenterErrorCount: number;
  fatalError: string | null;
}

/**
 * Maximum number of metrics samples to keep in the metrics window.
 *
 * Used for calculating rolling averages of performance metrics.
 */
export const METRICS_MAX_SAMPLES = 30;

/**
 * Global worker state instance.
 *
 * Shared state object used throughout the worker for frame processing,
 * configuration, and resource management.
 */
export const state: BackgroundEffectsWorkerState = {
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
  currentModelPath: null,
  pendingModelPath: null,
  segmenterInitPromise: null,
  metrics: {
    avgTotalMs: 0,
    avgSegmentationMs: 0,
    avgGpuMs: 0,
    segmentationDelegate: null,
    droppedFrames: 0,
    tier: 'superhigh',
  },
  metricsWindow: createMetricsWindow(METRICS_MAX_SAMPLES),
  frameCount: 0,
  background: null,
  backgroundSize: null,
  lastTimestampMs: 0,
  canvas: null,
  contextLost: false,
  // Error handling
  segmenterErrorCount: 0,
  fatalError: null,
};
