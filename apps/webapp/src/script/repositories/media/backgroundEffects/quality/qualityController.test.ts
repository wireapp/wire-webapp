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

import {QualityController} from './qualityController';
import {DEFAULT_TUNING} from './tuning';

const MODE_BLUR = 'blur' as const;
const MODE_VIRTUAL = 'virtual' as const;

const TARGET_FPS = 30;
const PERFORMANCE_THRESHOLD = 1000;
const BUDGET_MS = PERFORMANCE_THRESHOLD / TARGET_FPS;
const DOWNGRADE_THRESHOLD_MS = BUDGET_MS * DEFAULT_TUNING.downgradeThresholdRatio;
const HYSTERESIS_FRAMES = DEFAULT_TUNING.hysteresisFrames;
const DOWNGRADE_MIN_SAMPLES = DEFAULT_TUNING.maxSamples * DEFAULT_TUNING.downgradeWarmupWindows;
const OVER_BUDGET_DEBT_FRAMES = DEFAULT_TUNING.overBudgetDebtFrames;
const COOLDOWN_FRAMES = DEFAULT_TUNING.cooldownFramesAfterDowngrade;

const cpuBoundSample = {totalMs: 40, segmentationMs: 30, gpuMs: 5};
const gpuBoundSample = {totalMs: 40, segmentationMs: 5, gpuMs: 30};
const fastSample = {totalMs: 10, segmentationMs: 3, gpuMs: 3};
const slowSample = {totalMs: 40, segmentationMs: 10, gpuMs: 10};
const balancedSample = {totalMs: 40, segmentationMs: 20, gpuMs: 18};
const veryFastSample = {totalMs: 5, segmentationMs: 1, gpuMs: 1};

const OVER_BUDGET_DEBT_THRESHOLD_MS = BUDGET_MS * OVER_BUDGET_DEBT_FRAMES;
const OVER_BUDGET_DELTA_MS = Math.max(1, cpuBoundSample.totalMs - DOWNGRADE_THRESHOLD_MS);
const OVER_BUDGET_TRIGGER_FRAMES = Math.ceil(OVER_BUDGET_DEBT_THRESHOLD_MS / OVER_BUDGET_DELTA_MS);
const DOWNGRADE_TRIGGER_SAMPLES = Math.max(HYSTERESIS_FRAMES, DOWNGRADE_MIN_SAMPLES, OVER_BUDGET_TRIGGER_FRAMES) + 1;

describe('QualityController', () => {
  it('downgrades CPU/ML-bound workloads to the next tier', () => {
    const controller = new QualityController(TARGET_FPS);
    let params;
    for (let i = 0; i < DOWNGRADE_TRIGGER_SAMPLES; i += 1) {
      params = controller.update(cpuBoundSample, MODE_BLUR);
    }
    expect(params?.tier).toBe('high');
  });

  it('downgrades GPU-bound workloads more aggressively without entering bypass', () => {
    const controller = new QualityController(TARGET_FPS);
    let params = controller.getTier(MODE_BLUR);

    // first downgrade
    let guard = 0;
    while (params.tier === 'superhigh' && guard++ < PERFORMANCE_THRESHOLD) {
      params = controller.update(gpuBoundSample, MODE_BLUR);
    }

    expect(params.tier).toBe('high');

    // next downgrade
    guard = 0;
    while (params.tier === 'high' && guard++ < PERFORMANCE_THRESHOLD) {
      params = controller.update(gpuBoundSample, MODE_BLUR);
    }

    expect(params.tier).toBe('low');

    guard = 0;
    while (guard++ < PERFORMANCE_THRESHOLD) {
      params = controller.update(gpuBoundSample, MODE_BLUR);
    }
    expect(params.tier).toBe('low');
  });

  it('applies mode-specific overlays', () => {
    const controller = new QualityController(TARGET_FPS);
    const blur = controller.getTier(MODE_BLUR);
    const virtual = controller.getTier(MODE_VIRTUAL);
    expect(blur.temporalAlpha).not.toBe(virtual.temporalAlpha);
    expect(virtual.matteLow).toBeGreaterThan(0);
  });

  it('resets hysteresis when mode changes', () => {
    const controller = new QualityController(TARGET_FPS);
    controller.setTier('low');
    for (let i = 0; i < HYSTERESIS_FRAMES - 1; i += 1) {
      controller.update(fastSample, MODE_BLUR);
    }
    const params = controller.update(fastSample, MODE_VIRTUAL);
    expect(params.tier).toBe('low');
  });

  it('does not oscillate within a single hysteresis window', () => {
    const controller = new QualityController(TARGET_FPS);
    let params;
    for (let i = 0; i < HYSTERESIS_FRAMES - 5; i += 1) {
      params = controller.update(i % 2 === 0 ? slowSample : fastSample, MODE_BLUR);
    }
    expect(params?.tier).toBe('superhigh');
  });

  it('starts at tier superhigh', () => {
    const controller = new QualityController(TARGET_FPS);
    const params = controller.getTier(MODE_BLUR);
    expect(params.tier).toBe('superhigh');
  });

  it('upgrades tier when performance improves', () => {
    const controller = new QualityController(TARGET_FPS);
    // Start at tier C
    controller.setTier('low');
    expect(controller.getTier(MODE_BLUR).tier).toBe('low');

    // Provide fast samples to trigger upgrade
    let params;
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(veryFastSample, MODE_BLUR);
    }
    // Should upgrade from C to B
    expect(params?.tier).toBe('medium');

    // Continue with fast samples to upgrade further
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(veryFastSample, MODE_BLUR);
    }
    // Should upgrade from B to A
    expect(params?.tier).toBe('high');
  });

  it('prevents immediate upgrade after downgrade due to cooldown', () => {
    const controller = new QualityController(TARGET_FPS);

    // Start at tier superhigh
    let params = controller.getTier(MODE_BLUR);
    expect(params.tier).toBe('superhigh');

    // Trigger downgrade with CPU-bound samples (superhigh -> high)
    let guard = 0;
    while (params.tier === 'superhigh' && guard++ < PERFORMANCE_THRESHOLD) {
      params = controller.update(cpuBoundSample, MODE_BLUR);
    }
    expect(guard).toBeLessThan(PERFORMANCE_THRESHOLD);
    expect(params.tier).toBe('high');

    // Provide fast samples immediately after downgrade
    // Cooldown decrements each frame, so after 60 frames it will be 0
    // But we need to check before it expires - check after just a few frames
    for (let i = 0; i < 5; i++) {
      params = controller.update(veryFastSample, MODE_BLUR);
    }
    expect(params.tier).toBe('high'); // stay on high because cooldown > 0

    // Enough frames for cooldown
    guard = 0;
    while (guard++ < COOLDOWN_FRAMES) {
      params = controller.update(veryFastSample, MODE_BLUR);
    }

    // Now fulfill hysteresis
    guard = 0;
    while (guard++ < HYSTERESIS_FRAMES + 1) {
      params = controller.update(veryFastSample, MODE_BLUR);
    }

    // must NOT exceed 'high' due to maxTier cap
    expect(params.tier).not.toBe('superhigh');
    expect(['high', 'medium']).toContain(params.tier);
  });

  it('applies bypass mode and zero temporal alpha for tier bypass', () => {
    const controller = new QualityController(TARGET_FPS);
    controller.setTier('bypass');
    const params = controller.getTier(MODE_BLUR);
    expect(params.tier).toBe('bypass');
    expect(params.bypass).toBe(true);
    expect(params.temporalAlpha).toBe(0);
  });

  it('applies tier low virtual mode adjustments', () => {
    const controller = new QualityController(TARGET_FPS);
    controller.setTier('low');
    const virtualParams = controller.getTier(MODE_VIRTUAL);
    const blurParams = controller.getTier(MODE_BLUR);

    // Virtual mode should apply a different matte tuning than blur at the same tier.
    expect(virtualParams.matteLow).not.toBe(blurParams.matteLow);
    expect(virtualParams.matteHigh).not.toBe(blurParams.matteHigh);
    expect(virtualParams.matteLow).toBeLessThan(virtualParams.matteHigh);
  });

  it('calculates correct averages over sample window', () => {
    const controller = new QualityController(TARGET_FPS);

    // Add some samples
    controller.update({totalMs: 10, segmentationMs: 5, gpuMs: 3}, MODE_BLUR);
    controller.update({totalMs: 20, segmentationMs: 10, gpuMs: 8}, MODE_BLUR);
    controller.update({totalMs: 30, segmentationMs: 15, gpuMs: 12}, MODE_BLUR);

    const averages = controller.getAverages();
    expect(averages.totalMs).toBe(20);
    expect(averages.segmentationMs).toBe(10);
    expect(averages.gpuMs).toBeCloseTo(7.67, 1);
  });

  it('handles balanced CPU/GPU workloads', () => {
    const controller = new QualityController(TARGET_FPS);
    // Balanced sample: neither CPU nor GPU dominates (>55%)
    let params = controller.getTier(MODE_BLUR);
    let guard = 0;
    while (params.tier === 'superhigh' && guard++ < PERFORMANCE_THRESHOLD) {
      params = controller.update(balancedSample, MODE_BLUR);
    }
    // Should step down normally (superhigh -> high) for balanced workloads
    expect(params?.tier).toBe('high');
    expect(guard).toBeLessThan(PERFORMANCE_THRESHOLD);
  });

  it('manually sets tier and resets counters', () => {
    const controller = new QualityController(TARGET_FPS);
    // Manually set to tier C
    controller.setTier('low');
    expect(controller.getTier(MODE_BLUR).tier).toBe('low');

    // Should allow immediate tier change after setTier
    controller.setTier('high');
    expect(controller.getTier(MODE_BLUR).tier).toBe('high');
  });

  it('handles multiple tier transitions without auto-downgrading to bypass', () => {
    const controller = new QualityController(TARGET_FPS);
    let params = controller.getTier(MODE_BLUR);

    // superhigh -> high
    let guard = 0;
    while (params.tier === 'superhigh' && guard++ < PERFORMANCE_THRESHOLD) {
      params = controller.update(cpuBoundSample, MODE_BLUR);
    }
    expect(params?.tier).toBe('high');

    // high -> medium (CPU-bound downgrade)
    guard = 0;
    while (params.tier === 'high' && guard++ < PERFORMANCE_THRESHOLD) {
      params = controller.update(cpuBoundSample, MODE_BLUR);
    }
    expect(params.tier).toBe('medium');

    // medium -> low (further downgrade)
    guard = 0;
    while (params.tier === 'medium' && guard++ < PERFORMANCE_THRESHOLD) {
      params = controller.update(slowSample, MODE_BLUR);
    }
    expect(params?.tier).toBe('low');

    // low must remain low, never bypass
    guard = 0;
    while (params.tier === 'low' && guard++ < PERFORMANCE_THRESHOLD) {
      params = controller.update(slowSample, MODE_BLUR);
    }
    expect(params.tier).toBe('low');

    // low -> medium (upgrade path still works)
    guard = 0;
    while (params.tier === 'low' && guard++ < PERFORMANCE_THRESHOLD) {
      params = controller.update(veryFastSample, MODE_BLUR);
    }
    expect(params.tier).toBe('medium');
  });

  it('maintains sample window size limit', () => {
    const controller = new QualityController(TARGET_FPS);
    const sampleCount = DEFAULT_TUNING.maxSamples + 20;

    // Add more samples than maxSamples
    for (let i = 0; i < sampleCount; i += 1) {
      controller.update({totalMs: 10 + i, segmentationMs: 5, gpuMs: 3}, MODE_BLUR);
    }

    const averages = controller.getAverages();
    const first = 10 + (sampleCount - DEFAULT_TUNING.maxSamples);
    const last = 10 + (sampleCount - 1);
    const expectedAverage = (first + last) / 2;
    expect(averages.totalMs).toBeCloseTo(expectedAverage, 1);
  });

  it('handles boundary conditions at thresholds', () => {
    const controller = new QualityController(TARGET_FPS);
    const budget = PERFORMANCE_THRESHOLD / TARGET_FPS;
    const upgradeThreshold = budget * DEFAULT_TUNING.upgradeThresholdRatio;
    const justAboveUpgrade = upgradeThreshold + 0.5;
    const clearlyBelowUpgrade = upgradeThreshold - 5;

    const atUpgradeThreshold = {totalMs: justAboveUpgrade, segmentationMs: 10, gpuMs: 8};
    controller.setTier('medium');
    let params;
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(atUpgradeThreshold, MODE_BLUR);
    }
    // Just above threshold, should not upgrade.
    expect(params?.tier).toBe('medium');

    const belowUpgradeThreshold = {totalMs: clearlyBelowUpgrade, segmentationMs: 9, gpuMs: 8};
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(belowUpgradeThreshold, MODE_BLUR);
    }
    // Well below threshold, should upgrade.
    expect(params?.tier).toBe('superhigh');
  });

  it('does not auto-downgrade from low to bypass', () => {
    const controller = new QualityController(TARGET_FPS);
    controller.setTier('low');

    let params = controller.getTier(MODE_BLUR);

    for (let i = 0; i < PERFORMANCE_THRESHOLD; i += 1) {
      params = controller.update(slowSample, MODE_BLUR);
    }

    expect(params.tier).toBe('low');
  });
});
