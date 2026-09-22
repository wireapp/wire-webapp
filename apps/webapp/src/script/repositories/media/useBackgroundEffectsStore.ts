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
  SELFIE_MULTICLASS_MODEL_PATH,
  SELFIE_SEGMENTER_MODEL_PATH,
} from 'Repositories/media/backgroundEffects/pipe/options';
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

export type BackgroundEffectsQuality = 'privacy' | 'balanced' | 'performance';

export type BackgroundEffectsState = {
  isPerformancePanelEnabled: boolean;
  preferredEffect: BackgroundEffectSelection;
  metrics: RenderMetrics | undefined;
  model: string;
  lastVirtualBackgroundId: string;
  qualityTier: BackgroundEffectsQuality;
  effectiveQualityTier: BackgroundEffectsQuality;
  isInitializing: boolean;

  setIsPerformancePanelEnabled(value: boolean): void;
  setPreferredEffect(effect: BackgroundEffectSelection): void;
  setLastVirtualBackgroundId(backgroundId: string): void;
  setMetrics(metrics: RenderMetrics | undefined): void;
  setModel(model: string | undefined): void;
  setQualityTier(tier: BackgroundEffectsQuality): void;
  setEffectiveQualityTier(tier: BackgroundEffectsQuality): void;
  setIsInitializing(value: boolean): void;
};

export const backgroundEffectsStore = createStore<BackgroundEffectsState>()(
  immer<BackgroundEffectsState>(set => ({
    isPerformancePanelEnabled: false,
    preferredEffect: DEFAULT_BACKGROUND_EFFECT,
    metrics: undefined,
    model: 'unknown',
    lastVirtualBackgroundId: DEFAULT_BUILTIN_BACKGROUND_ID,
    qualityTier: 'privacy',
    effectiveQualityTier: 'privacy',

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
        switch (model) {
          case SELFIE_SEGMENTER_MODEL_PATH:
            state.model = 'selfie-segmenter';
            break;
          case SELFIE_MULTICLASS_MODEL_PATH:
            state.model = 'selfie-multiclass';
            break;
          default:
            state.model = 'unknown';
        }
      }),

    setQualityTier: tier =>
      set(state => {
        state.qualityTier = tier;
      }),

    setEffectiveQualityTier: tier =>
      set(state => {
        state.effectiveQualityTier = tier;
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
