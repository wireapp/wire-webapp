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

import {CellsRepository} from 'Repositories/cells/cellsrepository';

import {useAllCellsTagsStore, validateGetAllTagsResponse} from './useallcellstagsstore';

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

describe('useAllCellsTagsStore', () => {
  beforeEach(() => {
    useAllCellsTagsStore.setState({
      tags: [],
      isLoading: false,
      error: null,
      hasFetched: false,
    });
  });

  it('sets hasFetched to true after successfully fetching tags', async () => {
    const cellsRepository = {
      getAllTags: jest.fn().mockResolvedValue({Values: ['finance']}),
    } as unknown as CellsRepository;

    await useAllCellsTagsStore.getState().fetch(cellsRepository);

    expect(useAllCellsTagsStore.getState()).toMatchObject({
      tags: ['finance'],
      isLoading: false,
      error: null,
      hasFetched: true,
    });
  });

  it('keeps hasFetched false when the tags response is invalid', async () => {
    const cellsRepository = {
      getAllTags: jest.fn().mockResolvedValue({Values: ['finance', 123]}),
    } as unknown as CellsRepository;

    await useAllCellsTagsStore.getState().fetch(cellsRepository);

    expect(useAllCellsTagsStore.getState()).toMatchObject({
      tags: [],
      isLoading: false,
      hasFetched: false,
    });
    expect(useAllCellsTagsStore.getState().error).toBeInstanceOf(Error);
  });

  it('keeps hasFetched false when fetching tags fails', async () => {
    const cellsRepository = {
      getAllTags: jest.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as CellsRepository;

    await useAllCellsTagsStore.getState().fetch(cellsRepository);

    expect(useAllCellsTagsStore.getState()).toMatchObject({
      tags: [],
      isLoading: false,
      hasFetched: false,
    });
    expect(useAllCellsTagsStore.getState().error).toEqual(new Error('Network error'));
  });
});
