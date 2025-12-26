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

import {QualityController} from './QualityController';

const MODE_BLUR = 'blur' as const;
const MODE_VIRTUAL = 'virtual' as const;

const TARGET_FPS = 30;
const HYSTERESIS_FRAMES = 30;

const cpuBoundSample = {totalMs: 40, segmentationMs: 30, gpuMs: 5};
const gpuBoundSample = {totalMs: 40, segmentationMs: 5, gpuMs: 30};
const fastSample = {totalMs: 10, segmentationMs: 3, gpuMs: 3};
const slowSample = {totalMs: 40, segmentationMs: 10, gpuMs: 10};
const balancedSample = {totalMs: 40, segmentationMs: 20, gpuMs: 18};
const veryFastSample = {totalMs: 5, segmentationMs: 1, gpuMs: 1};

describe('QualityController', () => {
  it('downgrades CPU/ML-bound workloads to the next tier', () => {
    const controller = new QualityController(TARGET_FPS);
    let params;
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(cpuBoundSample, MODE_BLUR);
    }
    expect(params?.tier).toBe('B');
  });

  it('downgrades GPU-bound workloads more aggressively', () => {
    const controller = new QualityController(TARGET_FPS);
    let params;
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(gpuBoundSample, MODE_BLUR);
    }
    expect(params?.tier).toBe('C');
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
    controller.setTier('C');
    for (let i = 0; i < HYSTERESIS_FRAMES - 1; i += 1) {
      controller.update(fastSample, MODE_BLUR);
    }
    const params = controller.update(fastSample, MODE_VIRTUAL);
    expect(params.tier).toBe('C');
  });

  it('does not oscillate within a single hysteresis window', () => {
    const controller = new QualityController(TARGET_FPS);
    let params;
    for (let i = 0; i < HYSTERESIS_FRAMES - 5; i += 1) {
      params = controller.update(i % 2 === 0 ? slowSample : fastSample, MODE_BLUR);
    }
    expect(params?.tier).toBe('A');
  });

  it('starts at tier A', () => {
    const controller = new QualityController(TARGET_FPS);
    const params = controller.getTier(MODE_BLUR);
    expect(params.tier).toBe('A');
  });

  it('upgrades tier when performance improves', () => {
    const controller = new QualityController(TARGET_FPS);
    // Start at tier C
    controller.setTier('C');
    expect(controller.getTier(MODE_BLUR).tier).toBe('C');

    // Provide fast samples to trigger upgrade
    let params;
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(veryFastSample, MODE_BLUR);
    }
    // Should upgrade from C to B
    expect(params?.tier).toBe('B');

    // Continue with fast samples to upgrade further
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(veryFastSample, MODE_BLUR);
    }
    // Should upgrade from B to A
    expect(params?.tier).toBe('A');
  });

  it('prevents immediate upgrade after downgrade due to cooldown', () => {
    const controller = new QualityController(TARGET_FPS);
    // Start at tier A
    expect(controller.getTier(MODE_BLUR).tier).toBe('A');

    // Trigger downgrade with CPU-bound samples (A -> B)
    let params;
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(cpuBoundSample, MODE_BLUR);
    }
    // Should downgrade to B, and cooldown is set to 30 frames
    expect(params?.tier).toBe('B');

    // Provide fast samples immediately after downgrade
    // Cooldown decrements each frame, so after 30 frames it will be 0
    // But we need to check before it expires - check after just a few frames
    for (let i = 0; i < 5; i += 1) {
      params = controller.update(veryFastSample, MODE_BLUR);
    }
    // Should still be at B due to cooldown (cooldown > 0)
    expect(params?.tier).toBe('B');

    // Continue providing fast samples - cooldown decrements each frame
    // After 30 total frames from downgrade, cooldown expires
    for (let i = 0; i < 25; i += 1) {
      params = controller.update(veryFastSample, MODE_BLUR);
    }
    // Cooldown should now be 0, but we need another hysteresis period to upgrade
    // Provide more fast samples to trigger upgrade
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(veryFastSample, MODE_BLUR);
    }
    // Should have upgraded from B to A after cooldown expired
    expect(params?.tier).toBe('A');
  });

  it('applies bypass mode and zero temporal alpha for tier D', () => {
    const controller = new QualityController(TARGET_FPS);
    controller.setTier('D');
    const params = controller.getTier(MODE_BLUR);
    expect(params.tier).toBe('D');
    expect(params.bypass).toBe(true);
    expect(params.temporalAlpha).toBe(0);
  });

  it('applies tier C virtual mode adjustments', () => {
    const controller = new QualityController(TARGET_FPS);
    controller.setTier('C');
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
    let params;
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(balancedSample, MODE_BLUR);
    }
    // Should step down normally (A -> B) for balanced workloads
    expect(params?.tier).toBe('B');
  });

  it('manually sets tier and resets counters', () => {
    const controller = new QualityController(TARGET_FPS);
    // Manually set to tier C
    controller.setTier('C');
    expect(controller.getTier(MODE_BLUR).tier).toBe('C');

    // Should allow immediate tier change after setTier
    controller.setTier('A');
    expect(controller.getTier(MODE_BLUR).tier).toBe('A');
  });

  it('handles multiple tier transitions', () => {
    const controller = new QualityController(TARGET_FPS);
    let params;

    // A -> B (CPU-bound downgrade)
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(cpuBoundSample, MODE_BLUR);
    }
    expect(params?.tier).toBe('B');

    // B -> C (further downgrade)
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(slowSample, MODE_BLUR);
    }
    expect(params?.tier).toBe('C');

    // C -> D (final downgrade)
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(slowSample, MODE_BLUR);
    }
    expect(params?.tier).toBe('D');

    // D -> C (upgrade path)
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(veryFastSample, MODE_BLUR);
    }
    expect(params?.tier).toBe('C');
  });

  it('maintains sample window size limit', () => {
    const controller = new QualityController(TARGET_FPS);

    // Add more samples than maxSamples (30)
    for (let i = 0; i < 50; i += 1) {
      controller.update({totalMs: 10 + i, segmentationMs: 5, gpuMs: 3}, MODE_BLUR);
    }

    const averages = controller.getAverages();
    // Should only average the last 30 samples, not all 50
    // Last 30 samples: values 30-59 (indices 20-49 in the loop, but values are 10+i)
    // Average = (30+31+...+59)/30 = (30+59)*30/2/30 = 44.5
    expect(averages.totalMs).toBeGreaterThan(40);
    expect(averages.totalMs).toBeLessThan(50);
    // Verify it's close to the expected average of last 30 samples
    expect(averages.totalMs).toBeCloseTo(44.5, 0);
  });

  it('handles boundary conditions at thresholds', () => {
    const controller = new QualityController(TARGET_FPS);
    const budget = 1000 / TARGET_FPS;
    const upgradeThreshold = budget * 0.6;
    const justAboveUpgrade = upgradeThreshold + 0.5;
    const clearlyBelowUpgrade = upgradeThreshold - 5;

    const atUpgradeThreshold = {totalMs: justAboveUpgrade, segmentationMs: 10, gpuMs: 8};
    controller.setTier('B');
    let params;
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(atUpgradeThreshold, MODE_BLUR);
    }
    // Just above threshold, should not upgrade.
    expect(params?.tier).toBe('B');

    const belowUpgradeThreshold = {totalMs: clearlyBelowUpgrade, segmentationMs: 9, gpuMs: 8};
    for (let i = 0; i < HYSTERESIS_FRAMES + 1; i += 1) {
      params = controller.update(belowUpgradeThreshold, MODE_BLUR);
    }
    // Well below threshold, should upgrade.
    expect(params?.tier).toBe('A');
  });
});
