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

import type {Metrics} from '../types';

export interface MetricsSample {
  totalMs: number;
  segmentationMs: number;
  gpuMs: number;
}

export const pushMetricsSample = (samples: MetricsSample[], maxSamples: number, sample: MetricsSample): void => {
  samples.push(sample);
  if (samples.length > maxSamples) {
    samples.shift();
  }
};

export const buildMetrics = (samples: MetricsSample[], droppedFrames: number, tier: Metrics['tier']): Metrics => {
  const totals = samples.reduce(
    (acc, sample) => {
      acc.totalMs += sample.totalMs;
      acc.segmentationMs += sample.segmentationMs;
      acc.gpuMs += sample.gpuMs;
      return acc;
    },
    {totalMs: 0, segmentationMs: 0, gpuMs: 0},
  );
  const count = samples.length || 1;
  return {
    avgTotalMs: totals.totalMs / count,
    avgSegmentationMs: totals.segmentationMs / count,
    avgGpuMs: totals.gpuMs / count,
    droppedFrames,
    tier,
  };
};
