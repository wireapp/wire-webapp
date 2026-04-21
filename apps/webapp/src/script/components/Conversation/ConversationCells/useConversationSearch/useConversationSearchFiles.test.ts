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
import {RestNode} from 'cells-sdk-ts';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {UserRepository} from 'Repositories/user/UserRepository';

import {useCellsStore} from '../common/useCellsStore/useCellsStore';

import {useConversationSearchFiles} from './useConversationSearchFiles';

const createNode = (uuid: string, path: string): RestNode => ({Uuid: uuid, Path: path, Type: 'LEAF'});

const createHook = (
  cellsRepository: jest.Mocked<CellsRepository>,
  userRepository: jest.Mocked<UserRepository>,
) =>
  renderHook(() =>
    useConversationSearchFiles({
      cellsRepository,
      userRepository,
      conversationQualifiedId: {id: 'conversation-id', domain: 'wire.com'},
      enabled: true,
      debounceMs: 0,
    }),
  );

describe('useConversationSearchFiles', () => {
  const conversationId = 'conversation-id';

  beforeEach(() => {
    useCellsStore.setState({
      nodesByConversation: {},
      paginationByConversation: {},
      status: 'idle',
      error: null,
      pageSize: 50,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the latest search results when an older request resolves later', async () => {
    let releaseFirstRequest!: () => void;
    const firstRequestPending = new Promise<void>(resolve => {
      releaseFirstRequest = resolve;
    });

    const cellsRepository = {
      searchNodes: jest.fn().mockImplementation(({query}: {query: string}) => {
        if (query === 'first') {
          return Promise.resolve({Nodes: [createNode('n1', '/wire-cells-web/first.pdf')], Pagination: null});
        }
        if (query === 'second') {
          return Promise.resolve({Nodes: [createNode('n2', '/wire-cells-web/second.pdf')], Pagination: null});
        }
        return Promise.resolve({Nodes: [], Pagination: null});
      }),
    } as unknown as jest.Mocked<CellsRepository>;

    const userRepository = {
      getUsersById: jest
        .fn()
        .mockImplementationOnce(async () => {
          await firstRequestPending;
          return [];
        })
        .mockResolvedValue([]),
    } as unknown as jest.Mocked<UserRepository>;

    const {result} = createHook(cellsRepository, userRepository);

    act(() => result.current.handleSearch('first'));

    // Wait until the first request is in-flight before firing the second
    await waitFor(() => expect(useCellsStore.getState().status).toBe('loading'));

    act(() => result.current.handleSearch('second'));

    await waitFor(() => {
      expect(useCellsStore.getState().getNodes({conversationId})[0]?.name).toBe('second.pdf');
    });

    // Resolve the stale first request — must not overwrite second result
    releaseFirstRequest();
    await act(async () => {
      await firstRequestPending;
      await Promise.resolve();
    });

    expect(useCellsStore.getState().getNodes({conversationId})[0]?.name).toBe('second.pdf');
  });

  it('discards in-flight search results when search is cleared', async () => {
    let releaseFirstRequest!: () => void;
    const firstRequestPending = new Promise<void>(resolve => {
      releaseFirstRequest = resolve;
    });

    const cellsRepository = {
      searchNodes: jest.fn().mockImplementation(({query}: {query: string}) => {
        if (query === 'first') {
          return Promise.resolve({Nodes: [createNode('n1', '/wire-cells-web/first.pdf')], Pagination: null});
        }
        return Promise.resolve({Nodes: [createNode('n_all', '/wire-cells-web/all.pdf')], Pagination: null});
      }),
    } as unknown as jest.Mocked<CellsRepository>;

    const userRepository = {
      getUsersById: jest
        .fn()
        .mockImplementationOnce(async () => {
          await firstRequestPending;
          return [];
        })
        .mockResolvedValue([]),
    } as unknown as jest.Mocked<UserRepository>;

    const {result} = createHook(cellsRepository, userRepository);

    act(() => result.current.handleSearch('first'));

    // Wait until the first request is in-flight before clearing
    await waitFor(() => expect(useCellsStore.getState().status).toBe('loading'));

    act(() => result.current.handleClearSearch());

    // FETCH_ALL_QUERY completes with its own result
    await waitFor(() => {
      expect(useCellsStore.getState().getNodes({conversationId})[0]?.name).toBe('all.pdf');
    });

    // Resolve the stale first request — must not overwrite the clear result
    releaseFirstRequest();
    await act(async () => {
      await firstRequestPending;
      await Promise.resolve();
    });

    expect(useCellsStore.getState().getNodes({conversationId})[0]?.name).toBe('all.pdf');
  });
});
