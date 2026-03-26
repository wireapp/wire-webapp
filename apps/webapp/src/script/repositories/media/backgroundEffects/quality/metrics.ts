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

import type {PerformanceSample} from './samples';

import type {Metrics} from '../backgroundEffectsWorkerTypes';

/**
 * Performance sample type alias for metrics collection.
 * Represents timing measurements for a single frame.
 */
export type MetricsSample = PerformanceSample;

/**
 * Rolling window for performance metrics collection.
 *
 * Uses a ring buffer to maintain a fixed-size window of recent performance samples.
 * Tracks running totals for efficient average calculation without re-scanning all samples.
 */
export interface MetricsWindow {
  /** Ring buffer of performance samples (null slots indicate unused positions). */
  samples: Array<MetricsSample | null>;
  /** Maximum number of samples in the window. */
  maxSamples: number;
  /** Next write index into the ring buffer (wraps around). */
  index: number;
  /** Number of valid samples currently in the window. */
  count: number;
  /** Running totals for all samples in the window (for efficient averaging). */
  totals: {totalMs: number; segmentationMs: number; gpuMs: number};
}

/**
 * Creates a new metrics window with the specified maximum sample count.
 *
 * Initializes a ring buffer structure for collecting performance samples.
 * The window starts empty and fills as samples are added.
 *
 * @param maxSamples - Maximum number of samples to retain in the window.
 *                     Must be at least 1 (will be clamped if less).
 * @returns A new, empty metrics window ready for sample collection.
 */
export const createMetricsWindow = (maxSamples: number): MetricsWindow => {
  const safeMaxSamples = Math.max(1, maxSamples);
  return {
    samples: new Array<MetricsSample | null>(safeMaxSamples).fill(null),
    maxSamples: safeMaxSamples,
    index: 0,
    count: 0,
    totals: {totalMs: 0, segmentationMs: 0, gpuMs: 0},
  };
};

/**
 * Resets a metrics window to its initial empty state.
 *
 * Clears all samples, resets counters, and zeros running totals.
 * The window can be reused after reset without creating a new instance.
 *
 * @param window - The metrics window to reset.
 */
export const resetMetricsWindow = (window: MetricsWindow): void => {
  window.samples.fill(null);
  window.index = 0;
  window.count = 0;
  window.totals.totalMs = 0;
  window.totals.segmentationMs = 0;
  window.totals.gpuMs = 0;
};

/**
 * Adds a new performance sample to the metrics window.
 *
 * Implements a ring buffer: when the window is full, the oldest sample is
 * overwritten. Running totals are updated incrementally for efficient averaging.
 *
 * @param window - The metrics window to add the sample to.
 * @param sample - The performance sample to add (timing measurements for one frame).
 */
export const pushMetricsSample = (window: MetricsWindow, sample: MetricsSample): void => {
  const outgoing = window.samples[window.index];
  if (outgoing) {
    window.totals.totalMs -= outgoing.totalMs;
    window.totals.segmentationMs -= outgoing.segmentationMs;
    window.totals.gpuMs -= outgoing.gpuMs;
  } else {
    window.count += 1;
  }

  window.samples[window.index] = sample;
  window.totals.totalMs += sample.totalMs;
  window.totals.segmentationMs += sample.segmentationMs;
  window.totals.gpuMs += sample.gpuMs;
  window.index = (window.index + 1) % window.maxSamples;
};

/**
 * Builds a Metrics object from a metrics window and additional context.
 *
 * Computes average timings from the window's running totals and combines
 * with tier information, dropped frame count, and segmentation delegate type.
 *
 * @param window - The metrics window containing performance samples.
 * @param droppedFrames - Number of frames dropped due to backpressure or performance issues.
 * @param tier - Current quality tier ('A', 'B', 'C', or 'D').
 * @param segmentationDelegate - Segmentation execution context ('CPU', 'GPU', or null if not applicable).
 * @returns Complete metrics object with averaged performance data.
 */
export const buildMetrics = (
  window: MetricsWindow,
  droppedFrames: number,
  tier: Metrics['tier'],
  segmentationDelegate: 'CPU' | 'GPU' | null = null,
): Metrics => {
  const count = window.count || 1;
  return {
    avgTotalMs: window.totals.totalMs / count,
    avgSegmentationMs: window.totals.segmentationMs / count,
    avgGpuMs: window.totals.gpuMs / count,
    segmentationDelegate,
    droppedFrames,
    tier,
  };
};
