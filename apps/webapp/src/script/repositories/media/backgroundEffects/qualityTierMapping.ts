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

import {BackgroundEffectsQuality} from 'Repositories/media/useBackgroundEffectsStore';

import {SELFIE_MULTICLASS_MODEL_PATH, SELFIE_SEGMENTER_MODEL_PATH} from './pipe/options';

export const qualityTierFromModel = (modelPath: string, enhancePerformance: boolean): BackgroundEffectsQuality => {
  if (modelPath === SELFIE_MULTICLASS_MODEL_PATH) {
    return 'privacy';
  }

  return enhancePerformance ? 'performance' : 'balanced';
};

export const deriveModelConfig = (
  tier: BackgroundEffectsQuality,
): {modelPath: string; enhancePerformance: boolean} => ({
  modelPath: tier === 'privacy' ? SELFIE_MULTICLASS_MODEL_PATH : SELFIE_SEGMENTER_MODEL_PATH,
  enhancePerformance: tier === 'performance',
});
