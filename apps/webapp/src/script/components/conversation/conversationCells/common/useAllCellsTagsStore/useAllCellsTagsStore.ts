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

import {Result, result} from 'true-myth';
import {z} from 'zod';
import {create} from 'zustand';

import {CellsRepository} from 'Repositories/cells/cellsRepository';

import {sortTagsAlphabetically} from '../sortTagsAlphabetically/sortTagsAlphabetically';

interface AllCellsTagsState {
  tags: string[];
  isLoading: boolean;
  error: Error | null;
  hasFetched: boolean;
  fetch: (cellsRepository: CellsRepository) => Promise<void>;
}

const getAllTagsResponseSchema = z.object({
  Values: z.array(z.string()).optional().default([]),
});

export function validateGetAllTagsResponse(raw: unknown): Result<string[], Error> {
  const validationResult = getAllTagsResponseSchema.safeParse(raw);

  if (validationResult.success) {
    const tags = validationResult.data.Values.filter(tagName => tagName.trim() !== '');
    return Result.ok(sortTagsAlphabetically(tags));
  }

  return Result.err(validationResult.error);
}

export const useAllCellsTagsStore = create<AllCellsTagsState>(set => ({
  tags: [],
  isLoading: false,
  error: null,
  hasFetched: false,
  fetch: async cellsRepository => {
    set({isLoading: true, error: null});
    try {
      const raw = await cellsRepository.getAllTags();
      const validated = validateGetAllTagsResponse(raw);

      if (result.isErr(validated)) {
        set({error: validated.error, hasFetched: false});
        return;
      }

      set({tags: validated.value, hasFetched: true});
    } catch (error: unknown) {
      set({error: error instanceof Error ? error : new Error('Failed to load tags'), hasFetched: false});
    } finally {
      set({isLoading: false});
    }
  },
}));
