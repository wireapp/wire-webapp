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

/**
 * Quality tier identifier. Tiers are ordered from highest quality (A) to lowest (D).
 * - A: Highest quality, full processing
 * - B: Medium-high quality, reduced cadence
 * - C: Medium quality, lower resolution and reduced effects
 * - D: Bypass mode, no processing
 */
type TierKey = 'A' | 'B' | 'C' | 'D';

/**
 * Performance tier parameters that control rendering quality and resource usage.
 * These parameters are applied before mode-specific overlays.
 */
interface PerfTierParams {
  /** Quality tier identifier. */
  tier: TierKey;
  /** Width of the segmentation mask in pixels. Lower values reduce CPU/ML cost. */
  segmentationWidth: number;
  /** Height of the segmentation mask in pixels. Lower values reduce CPU/ML cost. */
  segmentationHeight: number;
  /** Segmentation cadence (process every Nth frame). Higher values reduce CPU/ML cost. */
  segmentationCadence: number;
  /** Scale factor for mask refinement pass (0-1). Lower values reduce GPU cost. */
  maskRefineScale: number;
  /** Scale factor for blur downsampling (0-1). Lower values reduce GPU cost. */
  blurDownsampleScale: number;
  /** Blur radius in pixels. Lower values reduce GPU cost. */
  blurRadius: number;
  /** Joint bilateral filter radius in pixels. Lower values reduce GPU cost. */
  bilateralRadius: number;
  /** Spatial sigma for joint bilateral filter. Controls spatial smoothing. */
  bilateralSpatialSigma: number;
  /** Range sigma for joint bilateral filter. Controls edge preservation. */
  bilateralRangeSigma: number;
  /** If true, bypass all processing and pass through original frames. */
  bypass: boolean;
}

/**
 * Mode-specific overlay parameters that adjust matte processing and temporal smoothing.
 * These values are applied on top of tier parameters to optimize for each effect mode.
 */
interface ModeOverlay {
  /** Temporal smoothing alpha (0-1). Higher values increase temporal stability. */
  temporalAlpha: number;
  /** Lower threshold for soft matte edge (0-1). Controls where soft edges begin. */
  softLow: number;
  /** Upper threshold for soft matte edge (0-1). Controls where soft edges end. */
  softHigh: number;
  /** Lower threshold for matte cutoff (0-1). Pixels below this are considered background. */
  matteLow: number;
  /** Upper threshold for matte cutoff (0-1). Pixels above this are considered foreground. */
  matteHigh: number;
  /** Hysteresis value for matte thresholds to prevent flickering (0-1). */
  matteHysteresis: number;
}

/**
 * Quality tier definitions ordered from highest (A) to lowest (D) quality.
 * Each tier balances visual quality against performance by adjusting:
 * - Segmentation resolution and cadence (CPU/ML cost)
 * - Blur and bilateral filter parameters (GPU cost)
 * - Mask refinement and downsampling scales (GPU cost)
 */
const TIERS: Record<TierKey, PerfTierParams> = {
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
    bypass: true,
  },
};

/**
 * Default overlay parameters for each effect mode.
 * These values are tuned for optimal visual quality and can be adjusted
 * per-tier based on performance characteristics.
 */
const MODE_DEFAULTS: Record<Mode, ModeOverlay> = {
  blur: {
    temporalAlpha: 0.78,
    softLow: 0.3,
    softHigh: 0.65,
    matteLow: 0.45,
    matteHigh: 0.6,
    matteHysteresis: 0.04,
  },
  virtual: {
    temporalAlpha: 0.62,
    softLow: 0.3,
    softHigh: 0.65,
    matteLow: 0.45,
    matteHigh: 0.6,
    matteHysteresis: 0.04,
  },
};

/**
 * Adaptive quality controller that dynamically adjusts rendering quality tiers
 * based on real-time performance measurements.
 *
 * The controller uses a hysteresis-based system to prevent tier oscillation:
 * - Monitors frame processing time (segmentation + GPU rendering)
 * - Downgrades when performance exceeds 85% of frame budget
 * - Upgrades when performance is below 60% of frame budget
 * - Requires 30 stable frames before tier changes to prevent thrashing
 * - Implements cooldown periods after downgrades to ensure stability
 *
 * Tier selection considers dominant cost (CPU/ML vs GPU) to optimize
 * the most impactful parameters for each bottleneck.
 */
export class QualityController {
  /** Rolling window of performance samples for averaging. */
  private readonly samples: Sample[] = [];
  /** Maximum number of samples to retain in the rolling window. */
  private readonly maxSamples = 30;
  /** Current quality tier. Starts at 'A' (highest quality). */
  private tier: TierKey = 'A';
  /** Threshold in milliseconds below which we can upgrade tier (60% of frame budget). */
  private readonly upgradeThresholdMs: number;
  /** Threshold in milliseconds above which we must downgrade tier (85% of frame budget). */
  private readonly downgradeThresholdMs: number;
  /** Number of frames required for stability before allowing tier changes. */
  private readonly hysteresisFrames = 30;
  /** Counter tracking consecutive stable frames at current tier. */
  private stableFrames = 0;
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
    // Calculate frame budget: time available per frame to maintain target FPS
    const budget = 1000 / targetFps;
    // Upgrade threshold: 60% of budget - we have headroom to increase quality
    this.upgradeThresholdMs = budget * 0.6;
    // Downgrade threshold: 85% of budget - approaching frame budget limit
    this.downgradeThresholdMs = budget * 0.85;
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
    return this.applyModeOverlay(TIERS[this.tier], mode);
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

    // Evaluate tier changes only after sufficient stability period
    if (this.stableFrames >= this.hysteresisFrames) {
      // Downgrade if performance exceeds threshold
      if (avgTotalMs > this.downgradeThresholdMs) {
        // Determine dominant cost to optimize downgrade strategy
        const dominant = this.getDominantCost(avgTotalMs, avgSegmentationMs, avgGpuMs);
        const nextTier = this.downgradeTier(dominant);
        if (nextTier !== this.tier) {
          this.tier = nextTier;
          this.stableFrames = 0;
          // Apply cooldown to prevent immediate re-upgrade
          this.cooldownFrames = this.hysteresisFrames;
        }
      }
      // Upgrade if performance is well below threshold and cooldown expired
      else if (avgTotalMs < this.upgradeThresholdMs && this.cooldownFrames === 0) {
        const nextTier = this.upgradeTier();
        if (nextTier !== this.tier) {
          this.tier = nextTier;
          this.stableFrames = 0;
        }
      }
    }

    return this.applyModeOverlay(TIERS[this.tier], mode);
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
    }
  }

  /**
   * Applies mode-specific overlay parameters to base tier parameters.
   * Combines performance tier settings with mode-optimized matte processing values.
   *
   * @param tier - Base tier parameters.
   * @param mode - Effect mode to get overlay for.
   * @returns Combined quality tier parameters with mode-specific adjustments.
   */
  private applyModeOverlay(tier: PerfTierParams, mode: Mode): QualityTierParams {
    const overlay = this.getModeOverlay(mode, tier.tier);
    return {
      ...tier,
      softLow: overlay.softLow,
      softHigh: overlay.softHigh,
      matteLow: overlay.matteLow,
      matteHigh: overlay.matteHigh,
      matteHysteresis: overlay.matteHysteresis,
      temporalAlpha: overlay.temporalAlpha,
    };
  }

  /**
   * Gets mode-specific overlay parameters, with tier-specific adjustments.
   *
   * @param mode - Effect mode ('blur' or 'virtual').
   * @param tier - Current quality tier.
   * @returns Mode overlay parameters, adjusted for the tier if needed.
   */
  private getModeOverlay(mode: Mode, tier: TierKey): ModeOverlay {
    const base = MODE_DEFAULTS[mode];
    // Tier D (bypass) disables temporal smoothing
    if (tier === 'D') {
      return {...base, temporalAlpha: 0};
    }
    // Virtual background at tier C uses slightly wider matte range for better edge handling
    if (mode === 'virtual' && tier === 'C') {
      return {...base, matteLow: base.matteLow - 0.02, matteHigh: base.matteHigh + 0.02};
    }
    return base;
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
    if (this.tier === 'D') {
      return 'C';
    }
    if (this.tier === 'C') {
      return 'B';
    }
    // Tier B or A: can only go to A (maximum quality)
    return this.tier === 'B' ? 'A' : 'A';
  }
}
