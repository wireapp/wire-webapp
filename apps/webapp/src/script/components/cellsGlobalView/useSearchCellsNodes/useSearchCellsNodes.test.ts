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

import {act, renderHook} from '@testing-library/react';
import {RestNodeCollection} from 'cells-sdk-ts';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {UserRepository} from 'Repositories/user/userRepository';
import {createExecutingFireAndForgetInvokerForTest} from 'src/script/page/testSupport/rootContextTestSupport';

import {useSearchCellsNodes} from './useSearchCellsNodes';

import type {GlobalDriveFiltersState} from '../../Conversation/ConversationCells/common/driveFilters/driveFilters';
import type {CellsSort} from '../../Conversation/ConversationCells/common/useCellsSorting/useCellsSorting';
import {useCellsStore} from '../common/useCellsStore/useCellsStore';

const emptyFilters: GlobalDriveFiltersState = {
  selectedTagIds: [],
  selectedFileTypeIds: [],
  selectedCreatorIds: [],
  selectedConversationIds: [],
  isSharedViaLink: false,
};

type FakeCellsRepository = jest.Mocked<Pick<CellsRepository, 'searchNodes'>>;
type FakeUserRepository = jest.Mocked<Pick<UserRepository, 'getUsersById'>>;
type FakeConversationRepository = jest.Mocked<
  Pick<ConversationRepository, 'getAllCellEnabledGroupConversations' | 'getConversationById'>
>;

function createFakeCellsRepository(searchResult: Partial<RestNodeCollection> = {}): FakeCellsRepository {
  return {searchNodes: jest.fn().mockResolvedValue({Nodes: [], ...searchResult})};
}

function createFakeUserRepository(): FakeUserRepository {
  return {getUsersById: jest.fn().mockResolvedValue([])};
}

function createFakeConversationRepository(): FakeConversationRepository {
  return {
    getAllCellEnabledGroupConversations: jest.fn().mockReturnValue([]),
    getConversationById: jest.fn().mockResolvedValue({qualifiedId: {id: 'conversation-id', domain: 'example.com'}}),
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {promise, resolve, reject};
}

function createRestNode(name: string, uuid = name) {
  return {
    Uuid: uuid,
    Path: `wire-cells-web/${name}`,
    Type: 'LEAF',
    Modified: 1,
    Size: 1,
    UserMetadata: [],
    ContextWorkspace: {Uuid: 'conversation-id@example.com', Label: 'Conversation'},
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function wait(milliseconds: number) {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

function renderSearchHook({
  cellsRepository = createFakeCellsRepository(),
  userRepository = createFakeUserRepository(),
  conversationRepository = createFakeConversationRepository(),
  fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest(),
  filters = emptyFilters,
  sort = null,
}: {
  cellsRepository?: FakeCellsRepository;
  userRepository?: FakeUserRepository;
  conversationRepository?: FakeConversationRepository;
  fireAndForgetInvoker?: ReturnType<typeof createExecutingFireAndForgetInvokerForTest>;
  filters?: GlobalDriveFiltersState;
  sort?: CellsSort | null;
} = {}) {
  return {
    fireAndForgetInvoker,
    ...renderHook(() =>
      useSearchCellsNodes({
        cellsRepository: cellsRepository as unknown as CellsRepository,
        userRepository: userRepository as unknown as UserRepository,
        conversationRepository: conversationRepository as unknown as ConversationRepository,
        fireAndForgetInvoker,
        filters,
        sort,
      }),
    ),
  };
}

describe('useSearchCellsNodes', () => {
  beforeEach(() => {
    useCellsStore.getState().clearAll();
  });

  it('uses recency sorting for the global all-files view by default', async () => {
    const cellsRepository = createFakeCellsRepository();
    const {fireAndForgetInvoker} = renderSearchHook({cellsRepository});
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(cellsRepository.searchNodes).toHaveBeenCalledWith(
      expect.objectContaining({
        query: '*',
        sortBy: 'mtime',
        sortDirection: 'desc',
        type: 'file',
      }),
    );
  });

  it('lets the selected sort override the global default', async () => {
    const cellsRepository = createFakeCellsRepository();
    const {fireAndForgetInvoker} = renderSearchHook({
      cellsRepository,
      sort: {field: 'name', direction: 'asc'},
    });
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(cellsRepository.searchNodes).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'name',
        sortDirection: 'asc',
        type: 'file',
      }),
    );
  });

  it('cancels a pending debounced search when clearing the search input', async () => {
    const cellsRepository = createFakeCellsRepository();
    const {fireAndForgetInvoker, result} = renderSearchHook({cellsRepository});
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    act(() => {
      result.current.handleSearch('stale-query');
    });

    await act(async () => {
      await result.current.handleClearSearch();
      await wait(350);
    });

    expect(cellsRepository.searchNodes).toHaveBeenCalledTimes(2);
    expect(cellsRepository.searchNodes).not.toHaveBeenCalledWith(expect.objectContaining({query: 'stale-query'}));
  });

  it('ignores stale search responses when a newer request has already updated the files', async () => {
    const staleSearch = createDeferred<RestNodeCollection>();
    const currentSearch = createDeferred<RestNodeCollection>();
    const cellsRepository: FakeCellsRepository = {
      searchNodes: jest.fn().mockReturnValueOnce(staleSearch.promise).mockReturnValue(currentSearch.promise),
    };

    const {fireAndForgetInvoker, result} = renderSearchHook({cellsRepository});

    let currentSearchPromise!: Promise<void>;
    act(() => {
      currentSearchPromise = result.current.handleReload();
    });

    await act(async () => {
      currentSearch.resolve({Nodes: [createRestNode('current-file.pdf')]});
      await currentSearchPromise;
      await flushPromises();
    });

    staleSearch.resolve({Nodes: [createRestNode('stale-file.pdf')]});
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(useCellsStore.getState().nodes.map(node => node.name)).toEqual(['current-file.pdf']);
  });
});
