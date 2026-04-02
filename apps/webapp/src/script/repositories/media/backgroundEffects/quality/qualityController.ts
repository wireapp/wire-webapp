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

import {applyModeOverlay, TIER_DEFINITIONS} from './definitions';
import type {PerformanceSample} from './samples';
import {DEFAULT_TUNING} from './tuning';

import type {Mode, QualityTier, QualityTierParams} from '../backgroundEffectsWorkerTypes';

const DEFAULT_TARGET_FPS = 30;

/**
 * Adaptive quality controller that dynamically adjusts rendering quality tiers
 * based on real-time performance measurements.
 *
 * The controller uses a hysteresis-based system to prevent tier oscillation:
 * - Monitors frame processing time (segmentation + GPU rendering)
 * - Accumulates over-budget debt and downgrades once it exceeds a threshold
 * - Upgrades when performance is below the configured budget ratio
 * - Requires a stability window before tier changes to prevent thrashing
 * - Implements cooldown periods after downgrades to ensure stability
 *
 * Tier selection considers dominant cost (CPU/ML vs GPU) to optimize
 * the most impactful parameters for each bottleneck.
 */
export class QualityController {
  /** Maximum number of samples to retain in the rolling window. */
  private readonly maxSamples = DEFAULT_TUNING.maxSamples;
  /** Rolling window of performance samples for averaging (ring buffer). */
  private readonly samples: Array<PerformanceSample | null> = new Array<PerformanceSample | null>(this.maxSamples).fill(
    null,
  );
  /** Next write index into the sample ring buffer. */
  private sampleIndex = 0;
  /** Number of samples currently stored in the window. */
  private sampleCount = 0;
  /** Running totals for the current sample window. */
  private readonly sampleTotals = {totalMs: 0, segmentationMs: 0, gpuMs: 0};
  /** Total number of samples observed since the last reset. */
  private totalSamplesSeen = 0;
  /** Current quality tier. Starts at (highest quality). */
  private tier: QualityTier = 'superhigh';
  /** Maximum tier allowed for upgrades once performance caps are applied. */
  private maxTier: QualityTier | null = null;
  /** Frame time budget in milliseconds derived from target FPS. */
  private readonly budgetMs: number;
  /** Threshold in milliseconds below which we can upgrade tier. */
  private readonly upgradeThresholdMs: number;
  /** Threshold in milliseconds above which we must downgrade tier. */
  private readonly downgradeThresholdMs: number;
  /** EWMA smoothing factor for adaptive decisions. */
  private readonly ewmaAlpha: number;
  /** Over-budget debt threshold in milliseconds before downgrading. */
  private readonly overBudgetDebtThresholdMs: number;
  /** Debt recovery ratio applied when under the downgrade threshold. */
  private readonly overBudgetDebtRecoveryRatio: number;
  /** Accumulated over-budget debt in milliseconds. */
  private overBudgetDebtMs = 0;
  /** Exponentially weighted moving average of total frame time. */
  private ewmaTotalMs: number | null = null;
  /** Exponentially weighted moving average of segmentation time. */
  private ewmaSegmentationMs: number | null = null;
  /** Exponentially weighted moving average of GPU time. */
  private ewmaGpuMs: number | null = null;
  /** Number of frames required for stability before allowing tier changes. */
  private readonly hysteresisFrames: number;
  /** Minimum total sample count before allowing downgrades (warm-up period). */
  private readonly downgradeMinSamples: number;
  /** Ratio threshold for severe over-budget detection. */
  private readonly severeDowngradeRatio: number;
  /** Consecutive severe over-budget frames required to downgrade quickly. */
  private readonly severeDowngradeConfirmFrames: number;
  /** Minimum sample count before allowing a severe downgrade. */
  private readonly severeDowngradeMinSamples: number;
  /** Cooldown frames after downgrade before considering an upgrade. */
  private readonly cooldownFramesAfterDowngrade: number;
  /** Window after an upgrade to count a downgrade as a failed upgrade. */
  private readonly upgradeFailureWindowFrames: number;
  /** Maximum failed upgrade attempts before capping upgrades. */
  private readonly upgradeFailureLimit: number;
  /** Ratio threshold to decide dominant cost (segmentation vs GPU). */
  private readonly dominantRatioThreshold: number;
  /** Counter tracking consecutive stable frames at current tier. */
  private stableFrames = 0;
  /** Counter tracking consecutive severe over-budget frames. */
  private severeOverBudgetFrames = 0;
  /** Cooldown counter preventing immediate upgrades after downgrades. */
  private cooldownFrames = 0;
  /** Sample index when the last upgrade occurred. */
  private lastUpgradeSample: number | null = null;
  /** Count of recent failed upgrade attempts. */
  private upgradeFailureCount = 0;
  /** Current effect mode to apply mode-specific overlays. */
  private currentMode: Mode | null = null;

  /**
   * Creates a new quality controller.
   *
   * @param targetFps - Target frames per second. Used to calculate frame budget
   *                    and performance thresholds (budget = 1000ms / targetFps).
   */
  constructor(targetFps: number, maxTier: QualityTier | null = null) {
    const resolvedTargetFps = Number.isFinite(targetFps) && targetFps > 0 ? targetFps : DEFAULT_TARGET_FPS;
    if (process.env.NODE_ENV !== 'production') {
      if (resolvedTargetFps !== targetFps) {
        console.warn('[QualityController] invalid targetFps, falling back', {
          targetFps,
          resolvedTargetFps,
        });
      }
      console.info('[QualityController] init', {targetFps: resolvedTargetFps});
    }
    this.maxTier = maxTier;
    // Calculate frame budget: time available per frame to maintain target FPS
    const budget = 1000 / resolvedTargetFps;
    this.budgetMs = budget;
    // Upgrade threshold: require more headroom to increase quality
    this.upgradeThresholdMs = budget * DEFAULT_TUNING.upgradeThresholdRatio;
    // Downgrade threshold: approaching or exceeding the frame budget
    this.downgradeThresholdMs = budget * DEFAULT_TUNING.downgradeThresholdRatio;
    this.ewmaAlpha = DEFAULT_TUNING.ewmaAlpha;
    this.overBudgetDebtThresholdMs = budget * DEFAULT_TUNING.overBudgetDebtFrames;
    this.overBudgetDebtRecoveryRatio = DEFAULT_TUNING.overBudgetDebtRecoveryRatio;
    this.hysteresisFrames = DEFAULT_TUNING.hysteresisFrames;
    // Require full windows before downgrading to avoid cold-start spikes.
    this.downgradeMinSamples = this.maxSamples * DEFAULT_TUNING.downgradeWarmupWindows;
    this.severeDowngradeRatio = DEFAULT_TUNING.severeDowngradeRatio;
    this.severeDowngradeConfirmFrames = DEFAULT_TUNING.severeDowngradeConfirmFrames;
    this.severeDowngradeMinSamples = DEFAULT_TUNING.severeDowngradeWarmupFrames;
    this.cooldownFramesAfterDowngrade = DEFAULT_TUNING.cooldownFramesAfterDowngrade;
    this.upgradeFailureWindowFrames = DEFAULT_TUNING.upgradeFailureWindowFrames;
    this.upgradeFailureLimit = DEFAULT_TUNING.upgradeFailureLimit;
    this.dominantRatioThreshold = DEFAULT_TUNING.dominantRatioThreshold;
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
  public setTier(tier: QualityTier): void {
    this.tier = tier;
    this.stableFrames = 0;
    this.cooldownFrames = 0;
    this.resetSamples();
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
  public update(sample: PerformanceSample, mode: Mode): QualityTierParams {
    this.handleModeChange(mode);

    // Maintain rolling window of samples for averaging
    this.addSample(sample);
    this.totalSamplesSeen += 1;
    this.updateEwma(sample);
    const ewmaTotalMs = this.ewmaTotalMs ?? sample.totalMs;
    const ewmaSegmentationMs = this.ewmaSegmentationMs ?? sample.segmentationMs;
    const ewmaGpuMs = this.ewmaGpuMs ?? sample.gpuMs;
    const overBudgetRatio = ewmaTotalMs / this.budgetMs;

    // Increment stability counter and decrement cooldown
    this.stableFrames += 1;
    if (this.cooldownFrames > 0) {
      this.cooldownFrames -= 1;
    }
    const debtDelta = ewmaTotalMs - this.downgradeThresholdMs;
    if (debtDelta > 0) {
      this.overBudgetDebtMs += debtDelta;
    } else {
      this.overBudgetDebtMs = Math.max(0, this.overBudgetDebtMs + debtDelta * this.overBudgetDebtRecoveryRatio);
    }
    if (overBudgetRatio >= this.severeDowngradeRatio) {
      this.severeOverBudgetFrames += 1;
    } else {
      this.severeOverBudgetFrames = 0;
    }

    const isOverBudget = debtDelta > 0;
    const canDowngradeSevere =
      this.severeOverBudgetFrames >= this.severeDowngradeConfirmFrames &&
      this.totalSamplesSeen >= this.severeDowngradeMinSamples;
    const canDowngradeNormal =
      this.stableFrames >= this.hysteresisFrames &&
      this.overBudgetDebtMs >= this.overBudgetDebtThresholdMs &&
      this.totalSamplesSeen >= this.downgradeMinSamples &&
      isOverBudget;

    // Downgrade if performance exceeds threshold (severe path can bypass hysteresis)
    if (canDowngradeSevere || canDowngradeNormal) {
      // Determine dominant cost to optimize downgrade strategy
      const dominant = this.getDominantCost(ewmaTotalMs, ewmaSegmentationMs, ewmaGpuMs);
      const nextTier = this.downgradeTier(dominant);
      if (nextTier !== this.tier) {
        if (this.tier === 'superhigh') {
          this.applyMaxTierCap('high');
        }
        this.registerUpgradeFailure(nextTier);
        if (process.env.NODE_ENV !== 'production') {
          console.info('[QualityController] downgrade', {
            from: this.tier,
            to: nextTier,
            ewmaTotalMs,
            ewmaSegmentationMs,
            ewmaGpuMs,
            overBudgetDebtMs: this.overBudgetDebtMs,
            overBudgetDebtThresholdMs: this.overBudgetDebtThresholdMs,
            severeOverBudgetFrames: this.severeOverBudgetFrames,
            overBudgetRatio,
            sampleCount: this.sampleCount,
            maxTier: this.maxTier,
          });
        }
        this.tier = nextTier;
        this.stableFrames = 0;
        this.severeOverBudgetFrames = 0;
        this.overBudgetDebtMs = 0;
        // Apply cooldown to prevent immediate re-upgrade
        this.cooldownFrames = this.cooldownFramesAfterDowngrade;
      }
    }
    // Upgrade if performance is well below threshold and cooldown expired
    else if (
      this.stableFrames >= this.hysteresisFrames &&
      ewmaTotalMs < this.upgradeThresholdMs &&
      this.cooldownFrames === 0
    ) {
      const nextTier = this.upgradeTier();
      if (nextTier !== this.tier) {
        if (process.env.NODE_ENV !== 'production') {
          console.info('[QualityController] upgrade', {
            from: this.tier,
            to: nextTier,
            ewmaTotalMs,
            ewmaSegmentationMs,
            ewmaGpuMs,
            sampleCount: this.sampleCount,
            maxTier: this.maxTier,
          });
        }
        this.tier = nextTier;
        this.stableFrames = 0;
        this.severeOverBudgetFrames = 0;
        this.lastUpgradeSample = this.totalSamplesSeen;
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
  public getAverages(): PerformanceSample {
    const denom = Math.max(1, this.sampleCount);
    return {
      totalMs: this.sampleTotals.totalMs / denom,
      segmentationMs: this.sampleTotals.segmentationMs / denom,
      gpuMs: this.sampleTotals.gpuMs / denom,
    };
  }

  /**
   * Updates exponentially weighted moving averages for decision-making.
   *
   * Uses EWMA to smooth transient spikes while remaining responsive to trends.
   *
   * @param sample - Performance measurements for the frame to add.
   */
  private updateEwma(sample: PerformanceSample): void {
    if (this.ewmaTotalMs === null || this.ewmaSegmentationMs === null || this.ewmaGpuMs === null) {
      this.ewmaTotalMs = sample.totalMs;
      this.ewmaSegmentationMs = sample.segmentationMs;
      this.ewmaGpuMs = sample.gpuMs;
      return;
    }
    const alpha = this.ewmaAlpha;
    const invAlpha = 1 - alpha;
    this.ewmaTotalMs = alpha * sample.totalMs + invAlpha * this.ewmaTotalMs;
    this.ewmaSegmentationMs = alpha * sample.segmentationMs + invAlpha * this.ewmaSegmentationMs;
    this.ewmaGpuMs = alpha * sample.gpuMs + invAlpha * this.ewmaGpuMs;
  }

  /**
   * Adds a performance sample to the rolling window using a ring buffer.
   *
   * Implements efficient O(1) insertion by:
   * - Removing the outgoing sample's contribution from running totals (if window is full)
   * - Adding the new sample's contribution to running totals
   * - Updating the write index with wraparound
   * - Tracking sample count (increments only when window is not yet full)
   *
   * @param sample - Performance measurements for the frame to add.
   */
  private addSample(sample: PerformanceSample): void {
    const outgoing = this.samples[this.sampleIndex];
    if (outgoing) {
      this.sampleTotals.totalMs -= outgoing.totalMs;
      this.sampleTotals.segmentationMs -= outgoing.segmentationMs;
      this.sampleTotals.gpuMs -= outgoing.gpuMs;
    } else {
      this.sampleCount += 1;
    }

    this.samples[this.sampleIndex] = sample;
    this.sampleTotals.totalMs += sample.totalMs;
    this.sampleTotals.segmentationMs += sample.segmentationMs;
    this.sampleTotals.gpuMs += sample.gpuMs;
    this.sampleIndex = (this.sampleIndex + 1) % this.maxSamples;
  }

  /**
   * Resets the sample window to an empty state.
   *
   * Clears all samples, resets counters, and zeros running totals.
   * Used when manually setting tier or when mode changes to allow immediate
   * re-evaluation without stale data.
   */
  private resetSamples(): void {
    this.samples.fill(null);
    this.sampleIndex = 0;
    this.sampleCount = 0;
    this.sampleTotals.totalMs = 0;
    this.sampleTotals.segmentationMs = 0;
    this.sampleTotals.gpuMs = 0;
    this.totalSamplesSeen = 0;
    this.ewmaTotalMs = null;
    this.ewmaSegmentationMs = null;
    this.ewmaGpuMs = null;
    this.severeOverBudgetFrames = 0;
    this.overBudgetDebtMs = 0;
    this.lastUpgradeSample = null;
    this.upgradeFailureCount = 0;
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
      this.resetSamples();
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
    // Threshold indicates dominant cost component
    if (segRatio > this.dominantRatioThreshold) {
      return 'cpu';
    }
    if (gpuRatio > this.dominantRatioThreshold) {
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
  private downgradeTier(dominant: 'cpu' | 'gpu' | 'balanced'): QualityTier {
    if (this.tier === 'superhigh') {
      return 'high';
    }

    if (this.tier === 'high') {
      // GPU-bound: skip medium tier for stronger GPU cost reduction
      // CPU-bound: normal step down to B
      return dominant === 'gpu' ? 'low' : 'medium';
    }
    if (this.tier === 'medium') {
      return 'low';
    }
    if (this.tier === 'low') {
      return 'bypass';
    }

    // last case
    return 'bypass';
  }

  /**
   * Determines the next higher quality tier based on current tier.
   * Always steps up one tier at a time (D→C→B→A) for gradual quality improvement.
   *
   * @returns The next higher quality tier, or current tier if already at maximum.
   */
  private upgradeTier(): QualityTier {
    if (this.tier === 'superhigh') {
      return 'superhigh';
    }
    if (this.tier === 'bypass') {
      return this.canUpgradeTo('low') ? 'low' : 'bypass';
    }
    if (this.tier === 'low') {
      return this.canUpgradeTo('medium') ? 'medium' : 'low';
    }

    if (this.tier === 'medium') {
      return this.canUpgradeTo('high') ? 'high' : 'medium';
    }
    // Tier can only go to superhigh (maximum quality)
    return this.tier === 'high' && this.canUpgradeTo('superhigh') ? 'superhigh' : 'high';
  }

  /**
   * Tracks failed upgrade attempts and caps future upgrades when necessary.
   *
   * If a downgrade happens soon after an upgrade, it is treated as a failed
   * upgrade attempt. After a configurable number of failures, upgrades are
   * capped at the downgraded tier to avoid repeated oscillation.
   *
   * @param nextTier - The tier we are downgrading to.
   */
  private registerUpgradeFailure(nextTier: QualityTier): void {
    if (this.lastUpgradeSample === null) {
      return;
    }
    const framesSinceUpgrade = this.totalSamplesSeen - this.lastUpgradeSample;
    if (framesSinceUpgrade <= this.upgradeFailureWindowFrames) {
      this.upgradeFailureCount += 1;
      if (this.upgradeFailureCount >= this.upgradeFailureLimit) {
        this.applyMaxTierCap(nextTier);
      }
    }
    this.lastUpgradeSample = null;
  }

  /**
   * Applies a maximum tier cap, keeping the most restrictive cap.
   *
   * @param cap - The highest tier allowed for future upgrades.
   */
  private applyMaxTierCap(cap: QualityTier): void {
    if (!this.maxTier || this.getTierRank(cap) < this.getTierRank(this.maxTier)) {
      this.maxTier = cap;
      if (process.env.NODE_ENV !== 'production') {
        console.info('[QualityController] maxTier cap set', {maxTier: this.maxTier});
      }
    }
  }

  /**
   * Checks if an upgrade to the specified tier is allowed.
   *
   * When performance has been capped (maxTier is set), upgrades are restricted
   * to prevent exceeding the maximum tier that was reached before the cap.
   * This prevents oscillation after a performance-based downgrade from tier A.
   *
   * @param tier - The tier to check upgrade eligibility for.
   * @returns True if upgrade to the tier is allowed, false if it exceeds maxTier.
   */
  private canUpgradeTo(tier: QualityTier): boolean {
    if (!this.maxTier) {
      return true;
    }
    return this.getTierRank(tier) <= this.getTierRank(this.maxTier);
  }

  private getTierRank(tier: QualityTier): number {
    const rank: Record<QualityTier, number> = {
      bypass: 0,
      low: 1,
      medium: 2,
      high: 3,
      superhigh: 4,
    };
    return rank[tier];
  }
}
