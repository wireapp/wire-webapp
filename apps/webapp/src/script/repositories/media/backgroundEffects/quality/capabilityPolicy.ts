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

import {TIER_DEFINITIONS} from './definitions';

import type {
  CapabilityInfo,
  QualityPolicyMode,
  QualityPolicyResult,
  QualityPolicyResolver,
  QualityTier,
} from '../backgroundEffectsWorkerTypes';

/**
 * Downgrades a tier by one level (A→B→C→D).
 *
 * @param tier - Current tier to downgrade.
 * @returns Next lower tier, or 'D' if already at minimum.
 */
const downgradeTier = (tier: QualityTier): QualityTier => {
  if (tier === 'superhigh') {
    return 'high';
  }
  if (tier === 'high') {
    return 'medium';
  }
  if (tier === 'medium') {
    return 'low';
  }
  return 'bypass';
};

/**
 * Upgrades a tier by one level (D→C→B→A).
 *
 * @param tier - Current tier to upgrade.
 * @returns Next higher tier, or 'A' if already at maximum.
 */
const upgradeTier = (tier: QualityTier): QualityTier => {
  if (tier === 'bypass') {
    return 'low';
  }
  if (tier === 'low') {
    return 'medium';
  }
  if (tier === 'medium') {
    return 'high';
  }
  return 'superhigh';
};

/**
 * Determines the baseline quality tier based on browser capabilities.
 *
 * Tier selection priority:
 * - Tier A: WebGL2 + Worker + OffscreenCanvas (full GPU acceleration in worker)
 * - Tier B: WebGL2 only (GPU acceleration on main thread)
 * - Tier C: Canvas2D available (CPU-based rendering fallback)
 * - Tier D: No rendering capabilities (bypass mode)
 *
 * @param capabilities - Browser capability information.
 * @returns Baseline quality tier appropriate for the available capabilities.
 */
export const baselineTierForCapabilities = (capabilities: CapabilityInfo): QualityTier => {
  if (capabilities.webgl2 && capabilities.worker && capabilities.offscreenCanvas) {
    return 'superhigh';
  }
  if (capabilities.webgl2) {
    return 'medium';
  }
  if (typeof document !== 'undefined') {
    return 'low';
  }
  return 'bypass';
};

/**
 * Applies a quality policy mode to adjust the tier.
 *
 * Policy modes:
 * - 'conservative': Downgrades tier by one level (more stable, lower quality)
 * - 'aggressive': Upgrades tier by one level (higher quality, may be less stable)
 * - 'balanced': No adjustment (uses baseline tier)
 *
 * @param tier - Baseline tier to adjust.
 * @param policy - Quality policy mode to apply.
 * @returns Adjusted tier based on the policy mode.
 */
export const applyPolicyMode = (tier: QualityTier, policy: QualityPolicyMode): QualityTier => {
  if (policy === 'conservative') {
    return downgradeTier(tier);
  }
  if (policy === 'aggressive') {
    return upgradeTier(tier);
  }
  return tier;
};

/**
 * Resolves the initial quality tier and model configuration based on capabilities and policy.
 *
 * Resolution process:
 * 1. If policy is a function: Calls it with capabilities and returns the result
 * 2. If policy is a mode string:
 *    a. Determines baseline tier from capabilities
 *    b. Applies policy mode adjustment (conservative/aggressive/balanced)
 *    c. Configures model path overrides (non-WebGL2 browsers use tier B model for tier A)
 *
 * Model path override: When WebGL2 is not available, tier A uses tier B's model path.
 *
 * @param capabilities - Browser capability information.
 * @param policy - Quality policy mode ('conservative', 'aggressive', 'balanced') or
 *                 a custom resolver function that returns QualityPolicyResult.
 * @returns Quality policy result containing initial tier and optional model path overrides.
 */
export function resolveQualityPolicy(
  capabilities: CapabilityInfo,
  policy: QualityPolicyMode | QualityPolicyResolver,
): QualityPolicyResult {
  if (typeof policy === 'function') {
    return policy(capabilities);
  }

  let initialTier = baselineTierForCapabilities(capabilities);
  initialTier = applyPolicyMode(initialTier, policy);

  const segmentationModelByTier = capabilities.webgl2 ? undefined : {superhigh: TIER_DEFINITIONS.superhigh.modelPath};

  return {initialTier, segmentationModelByTier};
}
