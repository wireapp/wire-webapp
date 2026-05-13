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

import assert from 'node:assert';
import {result} from 'true-myth';

import {validateGetAllTagsResponse} from './useAllCellsTagsStore';

describe('validateGetAllTagsResponse()', () => {
  it('returns Result ok with tags for a valid getAllTags response', () => {
    const validationResult = validateGetAllTagsResponse({
      Values: ['finance', 'legal', 'design', '', '   '],
    });

    assert(result.isOk(validationResult));

    expect(validationResult.value).toEqual(['finance', 'legal', 'design']);
  });

  it('returns Result ok with empty tags when Values is missing', () => {
    const validationResult = validateGetAllTagsResponse({});

    assert(result.isOk(validationResult));

    expect(validationResult.value).toEqual([]);
  });

  it('returns Result err when Values is not an array of strings', () => {
    const validationResult = validateGetAllTagsResponse({
      Values: ['finance', 123],
    });

    expect(result.isErr(validationResult)).toBe(true);
  });
});
