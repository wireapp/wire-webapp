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

import {act, renderHook, waitFor} from '@testing-library/react';
import {RestNodeCollection} from 'cells-sdk-ts';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {UserRepository} from 'Repositories/user/userRepository';
import {createExecutingFireAndForgetInvokerForTest} from 'src/script/page/testSupport/rootContextTestSupport';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';

import {useConversationSearchFiles} from './useConversationSearchFiles';

import type {ConversationDriveFiltersState} from '../common/driveFilters/driveFilters';
import {useCellsStore} from '../common/useCellsStore/useCellsStore';

const CONV_ID = 'conv-abc';
const DOMAIN = 'staging.zinfra.io';
const QUALIFIED_ID = {id: CONV_ID, domain: DOMAIN};

const emptyFilters: ConversationDriveFiltersState = {
  selectedTagIds: [],
  selectedFileTypeIds: [],
  selectedCreatorIds: [],
  isSharedViaLink: false,
};

const staleFolderNode: CellNode = {
  id: 'folder-id',
  name: 'Arjita',
  path: `${CONV_ID}@${DOMAIN}/Arjita`,
  type: CellNodeType.FOLDER,
  extension: '',
  sizeMb: '-',
  uploadedAtTimestamp: 0,
  owner: '',
  conversationName: '',
  tags: [],
  presignedUrlExpiresAt: null,
  user: null,
};

type FakeCellsRepository = jest.Mocked<Pick<CellsRepository, 'searchNodes'>>;
type FakeUserRepository = jest.Mocked<Pick<UserRepository, 'getUsersById'>>;

function createFakeCellsRepository(searchResult: Partial<RestNodeCollection> = {}): FakeCellsRepository {
  return {searchNodes: jest.fn().mockResolvedValue({Nodes: [], ...searchResult})};
}

function createFakeUserRepository(): FakeUserRepository {
  return {getUsersById: jest.fn().mockResolvedValue([])};
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return {promise, resolve};
}

function renderSearchHook({
  cellsRepository = createFakeCellsRepository(),
  userRepository = createFakeUserRepository(),
  enabled = true,
  onClear = jest.fn(),
  fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest(),
  filters = emptyFilters,
}: {
  cellsRepository?: FakeCellsRepository;
  userRepository?: FakeUserRepository;
  enabled?: boolean;
  onClear?: () => void;
  fireAndForgetInvoker?: ReturnType<typeof createExecutingFireAndForgetInvokerForTest>;
  filters?: ConversationDriveFiltersState;
} = {}) {
  return {
    fireAndForgetInvoker,
    onClear,
    ...renderHook(() =>
      useConversationSearchFiles({
        cellsRepository: cellsRepository as unknown as CellsRepository,
        userRepository: userRepository as unknown as UserRepository,
        conversationQualifiedId: QUALIFIED_ID,
        enabled,
        fireAndForgetInvoker,
        filters,
        onClear,
      }),
    ),
  };
}

describe('useConversationSearchFiles', () => {
  beforeEach(() => {
    useCellsStore.getState().clearAll({conversationId: CONV_ID});
    window.location.hash = `/conversation/${CONV_ID}/${DOMAIN}/files`;
  });

  it('fires an initial fetch when enabled', async () => {
    const {fireAndForgetInvoker} = renderSearchHook();
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(useCellsStore.getState().status).toBe('success');
  });

  it('does not fetch when disabled', async () => {
    const cellsRepository = createFakeCellsRepository();
    const {fireAndForgetInvoker} = renderSearchHook({cellsRepository, enabled: false});
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(cellsRepository.searchNodes).not.toHaveBeenCalled();
  });

  it('uses the current folder as the search root when opening search from inside a folder', async () => {
    window.location.hash = `#/conversation/${CONV_ID}/${DOMAIN}/files/MyFolder`;
    const cellsRepository = createFakeCellsRepository();
    const {fireAndForgetInvoker} = renderSearchHook({cellsRepository});
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(cellsRepository.searchNodes).toHaveBeenCalledWith(
      expect.objectContaining({
        path: `${CONV_ID}@${DOMAIN}/MyFolder`,
        recursive: false,
        deleted: false,
        sortBy: undefined,
        sortDirection: undefined,
      }),
    );
  });

  it('loads recycle-bin contents when opening search from the recycle bin', async () => {
    window.location.hash = `#/conversation/${CONV_ID}/${DOMAIN}/files/recycle_bin`;
    const cellsRepository = createFakeCellsRepository();
    const {fireAndForgetInvoker} = renderSearchHook({cellsRepository});
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(cellsRepository.searchNodes).toHaveBeenCalledWith(
      expect.objectContaining({
        path: `${CONV_ID}@${DOMAIN}`,
        recursive: false,
        deleted: true,
      }),
    );
  });

  it('clears the previous browse rows as soon as search opens', async () => {
    const search = createDeferred<RestNodeCollection>();
    const cellsRepository = {searchNodes: jest.fn().mockReturnValue(search.promise)} as FakeCellsRepository;
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();

    useCellsStore.getState().setNodes({
      conversationId: CONV_ID,
      nodes: [staleFolderNode],
    });
    useCellsStore.getState().setStatus('success');

    renderSearchHook({cellsRepository, fireAndForgetInvoker});

    expect(useCellsStore.getState().getNodes({conversationId: CONV_ID})).toEqual([]);
    expect(useCellsStore.getState().status).toBe('loading');

    act(() => {
      search.resolve({Nodes: []});
    });
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());
  });

  it('does not write to the store when disabled mid-flight', async () => {
    const search = createDeferred<RestNodeCollection>();
    const cellsRepository = {searchNodes: jest.fn().mockReturnValue(search.promise)} as FakeCellsRepository;
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();

    const {rerender} = renderHook(
      ({enabled}: {enabled: boolean}) =>
        useConversationSearchFiles({
          cellsRepository: cellsRepository as unknown as CellsRepository,
          userRepository: createFakeUserRepository() as unknown as UserRepository,
          conversationQualifiedId: QUALIFIED_ID,
          enabled,
          fireAndForgetInvoker,
          filters: emptyFilters,
          onClear: jest.fn(),
        }),
      {initialProps: {enabled: true}},
    );

    act(() => rerender({enabled: false}));

    act(() => {
      search.resolve({Nodes: [{Path: `${CONV_ID}@${DOMAIN}/stale-file.txt`, Type: 'LEAF', Uuid: 'uuid-1'}]});
    });
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(useCellsStore.getState().getNodes({conversationId: CONV_ID})).toHaveLength(0);
  });

  it('searches recursively within the current folder when the user types a query', async () => {
    window.location.hash = `#/conversation/${CONV_ID}/${DOMAIN}/files/Arjita`;
    const cellsRepository = createFakeCellsRepository();
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();
    const {result} = renderSearchHook({cellsRepository, fireAndForgetInvoker});

    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    act(() => result.current.handleSearch('doc'));

    await waitFor(() =>
      expect(cellsRepository.searchNodes).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'doc',
          recursive: true,
          path: `${CONV_ID}@${DOMAIN}/Arjita`,
        }),
      ),
    );
  });

  it('searches recursively when an active filter is applied without a text query', async () => {
    const cellsRepository = createFakeCellsRepository();
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();

    renderSearchHook({
      cellsRepository,
      fireAndForgetInvoker,
      filters: {
        ...emptyFilters,
        selectedFileTypeIds: ['pictures'],
      },
    });

    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(cellsRepository.searchNodes).toHaveBeenCalledWith(
      expect.objectContaining({
        recursive: true,
      }),
    );
  });

  it('calls onClear when the search input is emptied', async () => {
    const onClear = jest.fn();
    const {result, fireAndForgetInvoker} = renderSearchHook({onClear});
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    act(() => result.current.handleSearch('test'));
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    act(() => result.current.handleSearch(''));
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(onClear).toHaveBeenCalled();
  });
});
