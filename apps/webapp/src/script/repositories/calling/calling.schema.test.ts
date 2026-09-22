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
 */

import {QUALITY} from '@wireapp/avs';

import {NetworkQualityInfoSchema, UNKNOWN_NETWORK_QUALITY} from './calling.schema';

describe('NetworkQualityInfoSchema', () => {
  it('accepts unknown network quality', () => {
    expect(NetworkQualityInfoSchema.parse({quality: UNKNOWN_NETWORK_QUALITY})).toEqual({
      quality: UNKNOWN_NETWORK_QUALITY,
    });
  });

  it('accepts all AVS network quality values', () => {
    expect(
      [QUALITY.NORMAL, QUALITY.MEDIUM, QUALITY.POOR, QUALITY.NETWORK_PROBLEM, QUALITY.RECONNECTING].map(
        quality => NetworkQualityInfoSchema.parse({quality}).quality,
      ),
    ).toEqual([1, 2, 3, 4, 5]);
  });
});
