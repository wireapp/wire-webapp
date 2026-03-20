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

export const DEFAULT_TUNING = {
  // Rolling window size for averaging performance samples.
  maxSamples: 30,
  // Upgrade when we are comfortably under budget (ratio of frame budget).
  upgradeThresholdRatio: 0.5,
  // Downgrade when we approach or exceed budget (ratio of frame budget).
  downgradeThresholdRatio: 1.0,
  // EWMA smoothing factor for adaptive decisions (0-1). Higher = more responsive.
  ewmaAlpha: 0.2,
  // Over-budget debt threshold expressed as N frame budgets before downgrade.
  overBudgetDebtFrames: 10,
  // How quickly debt is repaid when under the downgrade threshold (0-1).
  overBudgetDebtRecoveryRatio: 1,
  // Ratio threshold for triggering fast downgrades when severely over budget.
  severeDowngradeRatio: 2.0,
  // Consecutive severe over-budget frames required to downgrade quickly.
  severeDowngradeConfirmFrames: 4,
  // Minimum frames before allowing severe downgrade (settling period).
  severeDowngradeWarmupFrames: 30,
  // Frames required before considering any tier change.
  hysteresisFrames: 60,
  // Require N full sample windows before allowing downgrade.
  downgradeWarmupWindows: 3,
  // Cooldown frames after downgrade before considering upgrade.
  cooldownFramesAfterDowngrade: 60,
  // Window after an upgrade to consider a downgrade as a failed upgrade.
  upgradeFailureWindowFrames: 120,
  // Maximum failed upgrade attempts before capping upgrades.
  upgradeFailureLimit: 2,
  // Ratio threshold to decide dominant cost (segmentation vs GPU).
  dominantRatioThreshold: 0.55,
} as const;

export type QualityTuning = typeof DEFAULT_TUNING;
