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

import {SELFIE_MULTICLASS_MODEL_PATH, SELFIE_SEGMENTER_MODEL_PATH} from './pipe/options';
import {deriveModelConfig, qualityTierFromModel} from './qualityTierMapping';

describe('qualityTierFromModel', () => {
  it('returns privacy for the multiclass model regardless of performance preference', () => {
    expect(qualityTierFromModel(SELFIE_MULTICLASS_MODEL_PATH, false)).toBe('privacy');
    expect(qualityTierFromModel(SELFIE_MULTICLASS_MODEL_PATH, true)).toBe('privacy');
  });

  it('returns performance for a non-privacy model when performance is enhanced', () => {
    expect(qualityTierFromModel(SELFIE_SEGMENTER_MODEL_PATH, true)).toBe('performance');
  });

  it('returns balanced for a non-privacy model when performance is not enhanced', () => {
    expect(qualityTierFromModel(SELFIE_SEGMENTER_MODEL_PATH, false)).toBe('balanced');
  });
});

describe('deriveModelConfig', () => {
  it.each([
    ['privacy', SELFIE_MULTICLASS_MODEL_PATH, false],
    ['balanced', SELFIE_SEGMENTER_MODEL_PATH, false],
    ['performance', SELFIE_SEGMENTER_MODEL_PATH, true],
  ] as const)('maps the %s tier to its model configuration', (tier, modelPath, enhancePerformance) => {
    expect(deriveModelConfig(tier)).toEqual({modelPath, enhancePerformance});
  });
});
