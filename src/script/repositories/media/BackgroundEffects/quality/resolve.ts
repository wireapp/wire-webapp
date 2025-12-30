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

import {resolveTierParams} from '../quality/definitions';
import type {EffectMode, Mode, QualityMode, QualityTierParams} from '../types';

export interface QualityControllerLike {
  setTier(mode: Exclude<QualityMode, 'auto'>): void;
  getTier(mode: Mode): QualityTierParams;
}

export const getQualityMode = (mode: EffectMode): Mode => (mode === 'virtual' ? 'virtual' : 'blur');

export const getBypassTier = (mode: Mode): QualityTierParams => resolveTierParams('D', mode);

export const resolveQualityTier = (
  qualityController: QualityControllerLike | null,
  quality: QualityMode,
  mode: Mode,
): QualityTierParams => {
  if (!qualityController) {
    return getBypassTier(mode);
  }

  if (quality !== 'auto') {
    qualityController.setTier(quality);
  }

  return qualityController.getTier(mode);
};
