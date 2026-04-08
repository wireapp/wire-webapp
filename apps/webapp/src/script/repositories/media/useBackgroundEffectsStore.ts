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
import {BackgroundEffectSelection, DEFAULT_BACKGROUND_EFFECT} from 'Repositories/media/VideoBackgroundEffects';

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
  preferredEffect: BackgroundEffectSelection;
  metrics: RenderMetrics | undefined;
  model: string;

  setIsFeatureEnabled(value: boolean): void;
  setPreferredEffect(effect: BackgroundEffectSelection): void;
  setMetrics(metrics: RenderMetrics | undefined): void;
  setModel(model: string | undefined): void;
};

export const backgroundEffectsStore = createStore<BackgroundEffectsState>()(
  immer<BackgroundEffectsState>(set => ({
    isFeatureEnabled: false,
    preferredEffect: DEFAULT_BACKGROUND_EFFECT,
    metrics: undefined,
    model: 'unknown',

    setIsFeatureEnabled: value =>
      set(state => {
        state.isFeatureEnabled = value;
      }),

    setPreferredEffect: effect =>
      set(state => {
        state.preferredEffect = effect;
      }),

    setMetrics: metrics =>
      set(state => {
        state.metrics = metrics;
      }),

    setModel: model =>
      set(state => {
        state.model = model;
      }),
  })),
);

export const useBackgroundEffectsStore = <T>(selector: (state: BackgroundEffectsState) => T): T =>
  useStore(backgroundEffectsStore, selector);
