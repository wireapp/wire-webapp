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

import type {PipelineStats} from 'longpipe';
import {useStore} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import {createStore} from 'zustand/vanilla';

import type {BackgroundFrameSizes, BackgroundFpsDiagnostics} from './longpipeBackgroundEffects';
import {
  BackgroundEffectSelection,
  DEFAULT_BACKGROUND_EFFECT,
  DEFAULT_BUILTIN_BACKGROUND_ID,
} from './VideoBackgroundEffects';

export type BackgroundEffectsQuality = 'privacy' | 'balanced' | 'performance';

export type BackgroundEffectsState = {
  isPerformancePanelEnabled: boolean;
  preferredEffect: BackgroundEffectSelection;
  longpipeStats: PipelineStats | undefined;
  frameSizes: BackgroundFrameSizes | undefined;
  fpsDiagnostics: BackgroundFpsDiagnostics | undefined;
  lastVirtualBackgroundId: string;
  qualityTier: BackgroundEffectsQuality;
  isInitializing: boolean;

  setIsPerformancePanelEnabled(value: boolean): void;
  setPreferredEffect(effect: BackgroundEffectSelection): void;
  setLastVirtualBackgroundId(backgroundId: string): void;
  setLongpipeStats(stats: PipelineStats | undefined): void;
  setFrameSizes(sizes: BackgroundFrameSizes | undefined): void;
  setFpsDiagnostics(fps: BackgroundFpsDiagnostics | undefined): void;
  setQualityTier(tier: BackgroundEffectsQuality): void;
  setIsInitializing(value: boolean): void;
};

export const backgroundEffectsStore = createStore<BackgroundEffectsState>()(
  immer<BackgroundEffectsState>(set => {
    return {
      isPerformancePanelEnabled: false,
      preferredEffect: DEFAULT_BACKGROUND_EFFECT,
      longpipeStats: undefined,
      frameSizes: undefined,
      fpsDiagnostics: undefined,
      lastVirtualBackgroundId: DEFAULT_BUILTIN_BACKGROUND_ID,
      qualityTier: 'privacy',

      setIsPerformancePanelEnabled: value => {
        return set(state => {
          state.isPerformancePanelEnabled = value;
        });
      },

      setPreferredEffect: effect => {
        return set(state => {
          state.preferredEffect = effect;
        });
      },
      setLastVirtualBackgroundId: backgroundId => {
        return set(state => {
          state.lastVirtualBackgroundId = backgroundId;
        });
      },

      setLongpipeStats: stats => {
        return set(state => {
          state.longpipeStats = stats;
        });
      },
      setFrameSizes: sizes => {
        return set(state => {
          state.frameSizes = sizes;
        });
      },
      setFpsDiagnostics: fps => {
        return set(state => {
          state.fpsDiagnostics = fps;
        });
      },

      setQualityTier: tier => {
        return set(state => {
          state.qualityTier = tier;
        });
      },

      isInitializing: false,
      setIsInitializing: value => {
        return set(state => {
          state.isInitializing = value;
        });
      },
    };
  }),
);

export const useBackgroundEffectsStore = <T>(selector: (state: BackgroundEffectsState) => T): T => {
  return useStore(backgroundEffectsStore, selector);
};
