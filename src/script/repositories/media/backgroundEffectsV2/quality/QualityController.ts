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

import type {QualityTierParams} from '../types';

interface Sample {
  totalMs: number;
  segmentationMs: number;
  gpuMs: number;
}

const TIERS: Record<'A' | 'B' | 'C' | 'D', QualityTierParams> = {
  A: {
    tier: 'A',
    segmentationWidth: 256,
    segmentationHeight: 144,
    segmentationCadence: 1,
    maskRefineScale: 0.5,
    blurDownsampleScale: 0.5,
    blurRadius: 4,
    bilateralRadius: 5,
    bilateralSpatialSigma: 3.5,
    bilateralRangeSigma: 0.1,
    temporalAlpha: 0.8,
    bypass: false,
  },
  B: {
    tier: 'B',
    segmentationWidth: 256,
    segmentationHeight: 144,
    segmentationCadence: 2,
    maskRefineScale: 0.5,
    blurDownsampleScale: 0.5,
    blurRadius: 3,
    bilateralRadius: 4,
    bilateralSpatialSigma: 3.0,
    bilateralRangeSigma: 0.1,
    temporalAlpha: 0.78,
    bypass: false,
  },
  C: {
    tier: 'C',
    segmentationWidth: 160,
    segmentationHeight: 96,
    segmentationCadence: 2,
    maskRefineScale: 0.5,
    blurDownsampleScale: 0.25,
    blurRadius: 2,
    bilateralRadius: 3,
    bilateralSpatialSigma: 2.5,
    bilateralRangeSigma: 0.12,
    temporalAlpha: 0.75,
    bypass: false,
  },
  D: {
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
  },
};

export class QualityController {
  private readonly samples: Sample[] = [];
  private readonly maxSamples = 30;
  private tier: 'A' | 'B' | 'C' | 'D' = 'A';
  private readonly upgradeThresholdMs: number;
  private readonly downgradeThresholdMs: number;
  private readonly hysteresisFrames = 30;
  private stableFrames = 0;

  constructor(private readonly targetFps: number) {
    const budget = 1000 / targetFps;
    this.upgradeThresholdMs = budget * 0.6;
    this.downgradeThresholdMs = budget * 0.85;
  }

  public getTier(): QualityTierParams {
    return TIERS[this.tier];
  }

  public setTier(tier: 'A' | 'B' | 'C' | 'D'): void {
    this.tier = tier;
    this.stableFrames = 0;
  }

  public update(sample: Sample): QualityTierParams {
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    const avg = this.samples.reduce(
      (acc, item) => {
        acc.totalMs += item.totalMs;
        acc.segmentationMs += item.segmentationMs;
        acc.gpuMs += item.gpuMs;
        return acc;
      },
      {totalMs: 0, segmentationMs: 0, gpuMs: 0},
    );

    const denom = Math.max(1, this.samples.length);
    const avgTotalMs = avg.totalMs / denom;

    this.stableFrames += 1;

    if (this.stableFrames >= this.hysteresisFrames) {
      if (avgTotalMs > this.downgradeThresholdMs) {
        this.tier = this.tier === 'A' ? 'B' : this.tier === 'B' ? 'C' : 'D';
        this.stableFrames = 0;
      } else if (avgTotalMs < this.upgradeThresholdMs) {
        this.tier = this.tier === 'D' ? 'C' : this.tier === 'C' ? 'B' : 'A';
        this.stableFrames = 0;
      }
    }

    return TIERS[this.tier];
  }

  public getAverages(): Sample {
    const avg = this.samples.reduce(
      (acc, item) => {
        acc.totalMs += item.totalMs;
        acc.segmentationMs += item.segmentationMs;
        acc.gpuMs += item.gpuMs;
        return acc;
      },
      {totalMs: 0, segmentationMs: 0, gpuMs: 0},
    );

    const denom = Math.max(1, this.samples.length);
    return {
      totalMs: avg.totalMs / denom,
      segmentationMs: avg.segmentationMs / denom,
      gpuMs: avg.gpuMs / denom,
    };
  }
}
