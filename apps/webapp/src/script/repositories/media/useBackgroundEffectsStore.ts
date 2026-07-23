/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useStore} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import {createStore} from 'zustand/vanilla';

import {Metrics, QualityTier} from 'Repositories/media/backgroundEffects';
import {
  BackgroundEffectSelection,
  DEFAULT_BACKGROUND_EFFECT,
  DEFAULT_BUILTIN_BACKGROUND_ID,
} from 'Repositories/media/VideoBackgroundEffects';

export interface RenderMetrics extends Metrics {
  budget: number;
  utilShare: number;
  mlShare: number;
  webglShare: number;
  ml: 'ML(CPU)' | 'ML(GPU)' | 'ML';
  tier: QualityTier;
}

export type BackgroundEffectsState = {
  isFeatureEnabled: boolean;
  isPerformancePanelEnabled: boolean;
  preferredEffect: BackgroundEffectSelection;
  metrics: RenderMetrics | undefined;
  model: string;
  lastVirtualBackgroundId: string;
  isHighQualityBlurEnabled: boolean;
  isPerformanceEnhancementEnabled: boolean;
  isInitializing: boolean;

  setIsFeatureEnabled(value: boolean): void;
  setIsPerformancePanelEnabled(value: boolean): void;
  setPreferredEffect(effect: BackgroundEffectSelection): void;
  setLastVirtualBackgroundId(backgroundId: string): void;
  setMetrics(metrics: RenderMetrics | undefined): void;
  setModel(model: string | undefined): void;
  setIsHighQualityBlurEnabled(value: boolean): void;
  setIsPerformanceEnhancementEnabled(value: boolean): void;
  setIsInitializing(value: boolean): void;
};

export const backgroundEffectsStore = createStore<BackgroundEffectsState>()(
  immer<BackgroundEffectsState>(set => ({
    isFeatureEnabled: false,
    isPerformancePanelEnabled: false,
    preferredEffect: DEFAULT_BACKGROUND_EFFECT,
    metrics: undefined,
    model: 'unknown',
    lastVirtualBackgroundId: DEFAULT_BUILTIN_BACKGROUND_ID,
    isHighQualityBlurEnabled: false,
    isPerformanceEnhancementEnabled: false,

    setIsFeatureEnabled: value =>
      set(state => {
        state.isFeatureEnabled = value;
      }),
    setIsPerformancePanelEnabled: value =>
      set(state => {
        state.isPerformancePanelEnabled = value;
      }),

    setPreferredEffect: effect =>
      set(state => {
        state.preferredEffect = effect;
      }),
    setLastVirtualBackgroundId: backgroundId =>
      set(state => {
        state.lastVirtualBackgroundId = backgroundId;
      }),

    setMetrics: metrics =>
      set(state => {
        state.metrics = metrics;
      }),

    setModel: model =>
      set(state => {
        state.model = model ?? 'unknown';
      }),

    setIsHighQualityBlurEnabled: value =>
      set(state => {
        state.isHighQualityBlurEnabled = value;
      }),

    setIsPerformanceEnhancementEnabled: value =>
      set(state => {
        state.isPerformanceEnhancementEnabled = value;
      }),

    isInitializing: false,
    setIsInitializing: value =>
      set(state => {
        state.isInitializing = value;
      }),
  })),
);

export const useBackgroundEffectsStore = <T>(selector: (state: BackgroundEffectsState) => T): T =>
  useStore(backgroundEffectsStore, selector);
