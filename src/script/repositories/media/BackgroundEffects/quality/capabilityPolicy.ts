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

import {TIER_DEFINITIONS, type TierKey} from './definitions';

import type {CapabilityInfo, QualityPolicyMode, QualityPolicyResult, QualityPolicyResolver} from '../types';

const downgradeTier = (tier: TierKey): TierKey => {
  if (tier === 'A') {
    return 'B';
  }
  if (tier === 'B') {
    return 'C';
  }
  return 'D';
};

const upgradeTier = (tier: TierKey): TierKey => {
  if (tier === 'D') {
    return 'C';
  }
  if (tier === 'C') {
    return 'B';
  }
  return 'A';
};

export const baselineTierForCapabilities = (capabilities: CapabilityInfo): TierKey => {
  if (capabilities.webgl2 && capabilities.worker && capabilities.offscreenCanvas) {
    return 'A';
  }
  if (capabilities.webgl2) {
    return 'B';
  }
  if (typeof document !== 'undefined') {
    return 'C';
  }
  return 'D';
};

export const applyPolicyMode = (tier: TierKey, policy: QualityPolicyMode): TierKey => {
  if (policy === 'conservative') {
    return downgradeTier(tier);
  }
  if (policy === 'aggressive') {
    return upgradeTier(tier);
  }
  return tier;
};

export function resolveQualityPolicy(
  capabilities: CapabilityInfo,
  policy: QualityPolicyMode | QualityPolicyResolver,
): QualityPolicyResult {
  if (typeof policy === 'function') {
    return policy(capabilities);
  }

  let initialTier = baselineTierForCapabilities(capabilities);
  initialTier = applyPolicyMode(initialTier, policy);

  const segmentationModelByTier = capabilities.webgl2 ? undefined : {A: TIER_DEFINITIONS.B.modelPath};

  return {initialTier, segmentationModelByTier};
}
