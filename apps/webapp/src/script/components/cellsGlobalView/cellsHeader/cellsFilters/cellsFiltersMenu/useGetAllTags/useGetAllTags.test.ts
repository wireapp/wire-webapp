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

import {renderHook, waitFor} from '@testing-library/react';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {createExecutingFireAndForgetInvokerForTest} from 'src/script/page/testSupport/rootContextTestSupport';

import {useGetAllTags} from './useGetAllTags';

describe('useGetAllTags', () => {
  it('returns tags alphabetically', async () => {
    const cellsRepository = {
      getAllTags: jest.fn().mockResolvedValue({Values: ['Zulu', 'alpha', 'Beta']}),
    } as unknown as CellsRepository;
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();

    const {result} = renderHook(() => useGetAllTags({cellsRepository, fireAndForgetInvoker}));

    await waitFor(() => expect(result.current.tags).toEqual(['alpha', 'Beta', 'Zulu']));
  });
});
