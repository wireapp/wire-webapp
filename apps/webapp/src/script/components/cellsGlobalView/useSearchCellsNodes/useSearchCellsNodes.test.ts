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
import type {Logger} from 'Util/logger';

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

type CellsRepositoryMock = jest.Mocked<Pick<CellsRepository, 'searchNodes'>>;
type UserRepositoryMock = jest.Mocked<Pick<UserRepository, 'getUsersById'>>;
type ConversationRepositoryMock = jest.Mocked<
  Pick<ConversationRepository, 'getAllCellEnabledGroupConversations' | 'getConversationById'>
>;
type LoggerMock = jest.Mocked<Pick<Logger, 'debug'>>;

function buildCellsRepositoryMock(searchResult: Partial<RestNodeCollection> = {}): CellsRepositoryMock {
  return {searchNodes: jest.fn().mockResolvedValue({Nodes: [], ...searchResult})};
}

function buildUserRepositoryMock(): UserRepositoryMock {
  return {getUsersById: jest.fn().mockResolvedValue([])};
}

function buildConversationRepositoryMock(): ConversationRepositoryMock {
  return {
    getAllCellEnabledGroupConversations: jest.fn().mockReturnValue([]),
    getConversationById: jest.fn().mockResolvedValue({qualifiedId: {id: 'conversation-id', domain: 'example.com'}}),
  };
}

function buildLoggerMock(): LoggerMock {
  return {debug: jest.fn()};
}

function createControllablePromise<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {promise, resolve, reject};
}

function buildRestNodeStub(name: string, uuid = name) {
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

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function createControllableDebouncedSearchStub() {
  let pendingSearch: (() => Promise<void>) | undefined;

  return {
    create: (search: (value: string) => Promise<void>) => {
      const debouncedSearch = (async (value: string): Promise<void> => {
        pendingSearch = () => search(value);
      }) as ((value: string) => Promise<void>) & {cancel: () => void};
      debouncedSearch.cancel = () => {
        pendingSearch = undefined;
      };
      return debouncedSearch;
    },
    flush: async () => {
      await pendingSearch?.();
      pendingSearch = undefined;
    },
  };
}

function renderSearchHook({
  cellsRepository = buildCellsRepositoryMock(),
  userRepository = buildUserRepositoryMock(),
  conversationRepository = buildConversationRepositoryMock(),
  fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest(),
  filters = emptyFilters,
  sort = null,
  createDebouncedSearch,
  logger = buildLoggerMock(),
}: {
  cellsRepository?: CellsRepositoryMock;
  userRepository?: UserRepositoryMock;
  conversationRepository?: ConversationRepositoryMock;
  fireAndForgetInvoker?: ReturnType<typeof createExecutingFireAndForgetInvokerForTest>;
  filters?: GlobalDriveFiltersState;
  sort?: CellsSort | null;
  createDebouncedSearch?: (
    search: (value: string) => Promise<void>,
  ) => ((value: string) => Promise<void>) & {cancel: () => void};
  logger?: LoggerMock;
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
        createDebouncedSearch,
        logger: logger as unknown as Logger,
      }),
    ),
  };
}

describe('useSearchCellsNodes', () => {
  beforeEach(() => {
    useCellsStore.getState().clearAll();
  });

  it('requests global files with recency sorting by default', async () => {
    const cellsRepository = buildCellsRepositoryMock();
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

  it('requests global files with the selected sort instead of the default', async () => {
    const cellsRepository = buildCellsRepositoryMock();
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

  it('keeps browse results when clearing a scheduled search before it runs', async () => {
    const cellsRepository: CellsRepositoryMock = {
      searchNodes: jest
        .fn()
        .mockResolvedValueOnce({Nodes: [buildRestNodeStub('initial-file.pdf')]})
        .mockResolvedValueOnce({Nodes: [buildRestNodeStub('browse-file.pdf')]})
        .mockResolvedValueOnce({Nodes: [buildRestNodeStub('stale-file.pdf')]}),
    };
    const debouncedSearchStub = createControllableDebouncedSearchStub();
    const {fireAndForgetInvoker, result} = renderSearchHook({
      cellsRepository,
      createDebouncedSearch: debouncedSearchStub.create,
    });
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    await act(async () => {
      result.current.handleSearch('stale-query');
      await result.current.handleClearSearch();
      await debouncedSearchStub.flush();
    });

    expect(result.current.searchValue).toBe('');
    expect(useCellsStore.getState().nodes.map(node => node.name)).toEqual(['browse-file.pdf']);
    expect(useCellsStore.getState().status).toBe('success');
  });

  it('does not replace files set after unmount when the pending request resolves', async () => {
    const requestAfterUnmount = createControllablePromise<RestNodeCollection>();
    const cellsRepository: CellsRepositoryMock = {
      searchNodes: jest
        .fn()
        .mockResolvedValueOnce({Nodes: [buildRestNodeStub('current-file.pdf')]})
        .mockReturnValueOnce(requestAfterUnmount.promise),
    };
    const {fireAndForgetInvoker, result, unmount} = renderSearchHook({cellsRepository});
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());
    const currentFiles = useCellsStore.getState().nodes;

    act(() => {
      void result.current.handleReload();
    });
    unmount();
    useCellsStore.setState({nodes: currentFiles});

    await act(async () => {
      requestAfterUnmount.resolve({Nodes: [buildRestNodeStub('unmounted-file.pdf')]});
      await flushMicrotasks();
    });

    expect(useCellsStore.getState().nodes.map(node => node.name)).toEqual(['current-file.pdf']);
  });

  it('keeps results from the newer request when the older request resolves last', async () => {
    const staleSearch = createControllablePromise<RestNodeCollection>();
    const currentSearch = createControllablePromise<RestNodeCollection>();
    const cellsRepository: CellsRepositoryMock = {
      searchNodes: jest.fn().mockReturnValueOnce(staleSearch.promise).mockReturnValue(currentSearch.promise),
    };
    const logger = buildLoggerMock();

    const {fireAndForgetInvoker, result} = renderSearchHook({cellsRepository, logger});

    let currentSearchPromise!: Promise<void>;
    act(() => {
      currentSearchPromise = result.current.handleReload();
    });

    await act(async () => {
      currentSearch.resolve({Nodes: [buildRestNodeStub('current-file.pdf')]});
      await currentSearchPromise;
      await flushMicrotasks();
    });

    staleSearch.resolve({Nodes: [buildRestNodeStub('stale-file.pdf')]});
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(logger.debug).toHaveBeenCalledWith('Ignoring stale request version:', 1);
    expect(useCellsStore.getState().nodes.map(node => node.name)).toEqual(['current-file.pdf']);
  });

  it('keeps newer results when an older request rejects last', async () => {
    const staleSearch = createControllablePromise<RestNodeCollection>();
    const currentSearch = createControllablePromise<RestNodeCollection>();
    const cellsRepository: CellsRepositoryMock = {
      searchNodes: jest.fn().mockReturnValueOnce(staleSearch.promise).mockReturnValue(currentSearch.promise),
    };
    const {fireAndForgetInvoker, result} = renderSearchHook({cellsRepository});

    let currentSearchPromise!: Promise<void>;
    act(() => {
      currentSearchPromise = result.current.handleReload();
    });

    await act(async () => {
      currentSearch.resolve({Nodes: [buildRestNodeStub('current-file.pdf')]});
      await currentSearchPromise;
      staleSearch.reject(new Error('stale request failed'));
      await fireAndForgetInvoker.waitUntilAllSettled();
    });

    expect(useCellsStore.getState().nodes.map(node => node.name)).toEqual(['current-file.pdf']);
    expect(useCellsStore.getState().status).toBe('success');
  });

  it('shows an error and clears results when the current request fails for a Cells participant', async () => {
    const cellsRepository: CellsRepositoryMock = {searchNodes: jest.fn().mockRejectedValue(new Error('request failed'))};
    const conversationRepository: ConversationRepositoryMock = {
      ...buildConversationRepositoryMock(),
      getAllCellEnabledGroupConversations: jest.fn().mockReturnValue([{}]),
    };
    const {fireAndForgetInvoker} = renderSearchHook({cellsRepository, conversationRepository});

    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(useCellsStore.getState().nodes).toEqual([]);
    expect(useCellsStore.getState().pagination).toBeNull();
    expect(useCellsStore.getState().status).toBe('error');
  });

  it('treats a current request failure as an empty result when the user has no Cells conversations', async () => {
    const cellsRepository: CellsRepositoryMock = {searchNodes: jest.fn().mockRejectedValue(new Error('request failed'))};
    const {fireAndForgetInvoker} = renderSearchHook({cellsRepository});

    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(useCellsStore.getState().nodes).toEqual([]);
    expect(useCellsStore.getState().pagination).toBeNull();
    expect(useCellsStore.getState().status).toBe('success');
  });
});
