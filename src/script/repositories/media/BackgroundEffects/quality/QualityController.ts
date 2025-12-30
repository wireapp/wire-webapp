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

import {applyModeOverlay, type TierKey, TIER_DEFINITIONS} from './definitions';

import type {Mode, QualityTierParams} from '../types';

/**
 * Performance sample containing timing measurements for a single frame.
 */
interface Sample {
  /** Total processing time in milliseconds (segmentation + GPU rendering). */
  totalMs: number;
  /** Time spent on ML segmentation in milliseconds. */
  segmentationMs: number;
  /** Time spent on GPU rendering operations in milliseconds. */
  gpuMs: number;
}

const DEFAULT_TUNING = {
  // Upgrade when we are comfortably under budget (ratio of frame budget).
  upgradeThresholdRatio: 0.5,
  // Downgrade when we approach budget (ratio of frame budget).
  downgradeThresholdRatio: 1.0,
  // Frames required before considering any tier change.
  hysteresisFrames: 60,
  // Consecutive over-budget averages required to downgrade.
  downgradeConfirmFrames: 10,
  // Require N full sample windows before allowing downgrade.
  downgradeWarmupWindows: 3,
} as const;

/**
 * Adaptive quality controller that dynamically adjusts rendering quality tiers
 * based on real-time performance measurements.
 *
 * The controller uses a hysteresis-based system to prevent tier oscillation:
 * - Monitors frame processing time (segmentation + GPU rendering)
 * - Downgrades when performance exceeds 90% of frame budget for several frames
 * - Upgrades when performance is below 50% of frame budget
 * - Requires 60 stable frames before tier changes to prevent thrashing
 * - Implements cooldown periods after downgrades to ensure stability
 *
 * Tier selection considers dominant cost (CPU/ML vs GPU) to optimize
 * the most impactful parameters for each bottleneck.
 */
export class QualityController {
  /** Rolling window of performance samples for averaging. */
  private readonly samples: Sample[] = [];
  /** Total number of samples observed since controller initialization. */
  private totalSamplesSeen = 0;
  /** Maximum number of samples to retain in the rolling window. */
  private readonly maxSamples = 30;
  /** Current quality tier. Starts at 'A' (highest quality). */
  private tier: TierKey = 'A';
  /** Maximum tier allowed for upgrades once performance caps are applied. */
  private maxTier: TierKey | null = null;
  /** Threshold in milliseconds below which we can upgrade tier (60% of frame budget). */
  private readonly upgradeThresholdMs: number;
  /** Threshold in milliseconds above which we must downgrade tier (85% of frame budget). */
  private readonly downgradeThresholdMs: number;
  /** Number of frames required for stability before allowing tier changes. */
  private readonly hysteresisFrames: number;
  /** Number of consecutive over-budget averages required to downgrade. */
  private readonly downgradeConfirmFrames: number;
  /** Minimum total sample count before allowing downgrades (warm-up period). */
  private readonly downgradeMinSamples: number;
  /** Counter tracking consecutive stable frames at current tier. */
  private stableFrames = 0;
  /** Counter tracking consecutive over-budget frames for downgrade confirmation. */
  private overBudgetFrames = 0;
  /** Cooldown counter preventing immediate upgrades after downgrades. */
  private cooldownFrames = 0;
  /** Current effect mode to apply mode-specific overlays. */
  private currentMode: Mode | null = null;

  /**
   * Creates a new quality controller.
   *
   * @param targetFps - Target frames per second. Used to calculate frame budget
   *                    and performance thresholds (budget = 1000ms / targetFps).
   */
  constructor(targetFps: number) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[QualityController] init', {targetFps});
    }
    // Calculate frame budget: time available per frame to maintain target FPS
    const budget = 1000 / targetFps;
    // Upgrade threshold: 50% of budget - require more headroom to increase quality
    this.upgradeThresholdMs = budget * DEFAULT_TUNING.upgradeThresholdRatio;
    // Downgrade threshold: 90% of budget - approaching frame budget limit
    this.downgradeThresholdMs = budget * DEFAULT_TUNING.downgradeThresholdRatio;
    this.hysteresisFrames = DEFAULT_TUNING.hysteresisFrames;
    this.downgradeConfirmFrames = DEFAULT_TUNING.downgradeConfirmFrames;
    // Require at least two full windows before downgrading to avoid cold-start spikes.
    this.downgradeMinSamples = this.maxSamples * DEFAULT_TUNING.downgradeWarmupWindows;
  }

  /**
   * Gets the current quality tier parameters for the specified mode.
   * Applies mode-specific overlays to the base tier parameters.
   *
   * @param mode - The effect mode ('blur' or 'virtual').
   * @returns Quality tier parameters with mode-specific adjustments applied.
   */
  public getTier(mode: Mode): QualityTierParams {
    this.handleModeChange(mode);
    return applyModeOverlay(TIER_DEFINITIONS[this.tier], mode);
  }

  /**
   * Manually sets the quality tier, bypassing adaptive logic.
   * Resets stability counters to allow immediate tier changes.
   *
   * @param tier - The quality tier to set ('A', 'B', 'C', or 'D').
   */
  public setTier(tier: TierKey): void {
    this.tier = tier;
    this.stableFrames = 0;
    this.cooldownFrames = 0;
    this.overBudgetFrames = 0;
  }

  /**
   * Updates the quality controller with a new performance sample and returns
   * the current quality tier parameters.
   *
   * This method implements the adaptive quality algorithm:
   * 1. Adds the sample to the rolling window
   * 2. Calculates average performance over the window
   * 3. Evaluates tier changes based on thresholds and stability requirements
   * 4. Applies mode-specific overlays to the tier parameters
   *
   * @param sample - Performance measurements for the last processed frame.
   * @param mode - The current effect mode ('blur' or 'virtual').
   * @returns Quality tier parameters with mode-specific adjustments applied.
   */
  public update(sample: Sample, mode: Mode): QualityTierParams {
    this.handleModeChange(mode);

    // Maintain rolling window of samples for averaging
    this.samples.push(sample);
    this.totalSamplesSeen += 1;
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    // Calculate average performance metrics over the sample window
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
    const avgSegmentationMs = avg.segmentationMs / denom;
    const avgGpuMs = avg.gpuMs / denom;

    // Increment stability counter and decrement cooldown
    this.stableFrames += 1;
    if (this.cooldownFrames > 0) {
      this.cooldownFrames -= 1;
    }
    if (avgTotalMs > this.downgradeThresholdMs) {
      this.overBudgetFrames += 1;
    } else {
      this.overBudgetFrames = 0;
    }

    // Evaluate tier changes only after sufficient stability period
    if (this.stableFrames >= this.hysteresisFrames) {
      // Downgrade if performance exceeds threshold
      if (this.overBudgetFrames >= this.downgradeConfirmFrames && this.totalSamplesSeen >= this.downgradeMinSamples) {
        // Determine dominant cost to optimize downgrade strategy
        const dominant = this.getDominantCost(avgTotalMs, avgSegmentationMs, avgGpuMs);
        const nextTier = this.downgradeTier(dominant);
        if (nextTier !== this.tier) {
          if (this.tier === 'A') {
            this.maxTier = 'B';
            if (process.env.NODE_ENV !== 'production') {
              console.info('[QualityController] maxTier cap set', {maxTier: this.maxTier});
            }
          }
          if (process.env.NODE_ENV !== 'production') {
            console.info('[QualityController] downgrade', {
              from: this.tier,
              to: nextTier,
              avgTotalMs,
              avgSegmentationMs,
              avgGpuMs,
              overBudgetFrames: this.overBudgetFrames,
              sampleCount: this.samples.length,
              maxTier: this.maxTier,
            });
          }
          this.tier = nextTier;
          this.stableFrames = 0;
          this.overBudgetFrames = 0;
          // Apply cooldown to prevent immediate re-upgrade
          this.cooldownFrames = this.hysteresisFrames;
        }
      }
      // Upgrade if performance is well below threshold and cooldown expired
      else if (avgTotalMs < this.upgradeThresholdMs && this.cooldownFrames === 0) {
        const nextTier = this.upgradeTier();
        if (nextTier !== this.tier) {
          if (process.env.NODE_ENV !== 'production') {
            console.info('[QualityController] upgrade', {
              from: this.tier,
              to: nextTier,
              avgTotalMs,
              avgSegmentationMs,
              avgGpuMs,
              sampleCount: this.samples.length,
              maxTier: this.maxTier,
            });
          }
          this.tier = nextTier;
          this.stableFrames = 0;
        }
      }
    }

    return applyModeOverlay(TIER_DEFINITIONS[this.tier], mode);
  }

  /**
   * Gets the average performance metrics over the current sample window.
   * Useful for monitoring and debugging performance characteristics.
   *
   * @returns Average timing measurements across all samples in the window.
   */
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

  /**
   * Handles mode changes by resetting stability counters.
   * Mode changes can affect performance, so we reset hysteresis to allow
   * immediate tier re-evaluation.
   *
   * @param mode - The new effect mode.
   */
  private handleModeChange(mode: Mode): void {
    if (this.currentMode !== mode) {
      this.currentMode = mode;
      this.stableFrames = 0;
      this.cooldownFrames = 0;
      this.overBudgetFrames = 0;
    }
  }

  /**
   * Determines the dominant performance bottleneck from timing measurements.
   * Used to optimize tier downgrade strategy (e.g., skip tiers for GPU-bound cases).
   *
   * @param avgTotalMs - Average total processing time in milliseconds.
   * @param avgSegmentationMs - Average segmentation time in milliseconds.
   * @param avgGpuMs - Average GPU rendering time in milliseconds.
   * @returns 'cpu' if segmentation dominates (>55%), 'gpu' if GPU dominates (>55%),
   *          otherwise 'balanced'.
   */
  private getDominantCost(avgTotalMs: number, avgSegmentationMs: number, avgGpuMs: number): 'cpu' | 'gpu' | 'balanced' {
    if (avgTotalMs <= 0) {
      return 'balanced';
    }
    const segRatio = avgSegmentationMs / avgTotalMs;
    const gpuRatio = avgGpuMs / avgTotalMs;
    // Threshold: 55% indicates dominant cost component
    if (segRatio > 0.55) {
      return 'cpu';
    }
    if (gpuRatio > 0.55) {
      return 'gpu';
    }
    return 'balanced';
  }

  /**
   * Determines the next lower quality tier based on current tier and dominant cost.
   *
   * Downgrade policy:
   * - CPU/ML bound: Step down normally (A→B→C→D) to reduce segmentation cadence/resolution.
   * - GPU bound: Skip from A to C for a stronger GPU cost reduction (blur/bilateral parameters).
   * - Balanced: Step down normally.
   *
   * @param dominant - The dominant performance bottleneck ('cpu', 'gpu', or 'balanced').
   * @returns The next lower quality tier.
   */
  private downgradeTier(dominant: 'cpu' | 'gpu' | 'balanced'): TierKey {
    if (this.tier === 'A') {
      // GPU-bound: skip B tier for stronger GPU cost reduction
      // CPU-bound: normal step down to B
      return dominant === 'gpu' ? 'C' : 'B';
    }
    if (this.tier === 'B') {
      return 'C';
    }
    // Tier C or D: can only go to D (bypass)
    return this.tier === 'C' ? 'D' : 'D';
  }

  /**
   * Determines the next higher quality tier based on current tier.
   * Always steps up one tier at a time (D→C→B→A) for gradual quality improvement.
   *
   * @returns The next higher quality tier, or current tier if already at maximum.
   */
  private upgradeTier(): TierKey {
    if (this.tier === 'A') {
      return 'A';
    }
    if (this.tier === 'D') {
      return this.canUpgradeTo('C') ? 'C' : 'D';
    }
    if (this.tier === 'C') {
      return this.canUpgradeTo('B') ? 'B' : 'C';
    }
    // Tier B or A: can only go to A (maximum quality)
    return this.tier === 'B' && this.canUpgradeTo('A') ? 'A' : 'B';
  }

  private canUpgradeTo(tier: TierKey): boolean {
    if (!this.maxTier) {
      return true;
    }
    const rank: Record<TierKey, number> = {D: 0, C: 1, B: 2, A: 3};
    return rank[tier] <= rank[this.maxTier];
  }
}
