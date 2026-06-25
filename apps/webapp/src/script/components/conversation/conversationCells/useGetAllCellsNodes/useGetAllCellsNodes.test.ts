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
import {RestNode, RestNodeCollection} from 'cells-sdk-ts';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {UserRepository} from 'Repositories/user/userRepository';
import {createExecutingFireAndForgetInvokerForTest} from 'src/script/page/testSupport/rootContextTestSupport';

import {useGetAllCellsNodes} from './useGetAllCellsNodes';

import {useCellsStore} from '../common/useCellsStore/useCellsStore';

const CONV_ID = 'conv-abc';
const DOMAIN = 'staging.zinfra.io';
const QUALIFIED_ID = {id: CONV_ID, domain: DOMAIN};

type FakeCellsRepository = jest.Mocked<Pick<CellsRepository, 'getAllNodes'>>;
type FakeUserRepository = jest.Mocked<Pick<UserRepository, 'getUsersById'>>;

function createRestNode(name: string, uuid = name): RestNode {
  return {Path: `${CONV_ID}@${DOMAIN}/${name}`, Type: 'LEAF', Uuid: uuid};
}

function createFakeCellsRepository(result: Partial<RestNodeCollection> = {}): FakeCellsRepository {
  return {getAllNodes: jest.fn().mockResolvedValue({Nodes: [], ...result})};
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

function renderGetAllNodesHook({
  cellsRepository = createFakeCellsRepository(),
  userRepository = createFakeUserRepository(),
  enabled = true,
  fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest(),
}: {
  cellsRepository?: FakeCellsRepository;
  userRepository?: FakeUserRepository;
  enabled?: boolean;
  fireAndForgetInvoker?: ReturnType<typeof createExecutingFireAndForgetInvokerForTest>;
} = {}) {
  return {
    fireAndForgetInvoker,
    ...renderHook(
      ({enabled}: {enabled: boolean}) =>
        useGetAllCellsNodes({
          cellsRepository: cellsRepository as unknown as CellsRepository,
          userRepository: userRepository as unknown as UserRepository,
          conversationQualifiedId: QUALIFIED_ID,
          enabled,
          fireAndForgetInvoker,
        }),
      {initialProps: {enabled}},
    ),
  };
}

describe('useGetAllCellsNodes', () => {
  beforeEach(() => {
    useCellsStore.getState().clearAll({conversationId: CONV_ID});
    window.location.hash = `/conversation/${CONV_ID}/${DOMAIN}/files`;
  });

  it('does not write to the store when disabled mid-flight', async () => {
    const fetch = createDeferred<RestNodeCollection>();
    const cellsRepository = {getAllNodes: jest.fn().mockReturnValue(fetch.promise)} as FakeCellsRepository;
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();

    const {rerender} = renderGetAllNodesHook({cellsRepository, fireAndForgetInvoker});
    await waitFor(() => expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(1));

    act(() => rerender({enabled: false}));

    act(() => {
      fetch.resolve({Nodes: [createRestNode('stale-file.txt')]});
    });
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(useCellsStore.getState().getNodes({conversationId: CONV_ID})).toHaveLength(0);
  });

  it('does not let an older response overwrite a newer fetch', async () => {
    const firstFetch = createDeferred<RestNodeCollection>();
    const secondFetch = createDeferred<RestNodeCollection>();
    const cellsRepository = {
      getAllNodes: jest.fn().mockReturnValueOnce(firstFetch.promise).mockReturnValueOnce(secondFetch.promise),
    } as FakeCellsRepository;
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();

    const {result} = renderGetAllNodesHook({cellsRepository, fireAndForgetInvoker});
    await waitFor(() => expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(1));

    act(() => result.current.setOffset(50));
    await waitFor(() => expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(2));

    act(() => {
      secondFetch.resolve({Nodes: [createRestNode('new-file.txt')]});
    });
    await waitFor(() =>
      expect(useCellsStore.getState().getNodes({conversationId: CONV_ID})[0]?.name).toBe('new-file.txt'),
    );

    act(() => {
      firstFetch.resolve({Nodes: [createRestNode('stale-file.txt')]});
    });
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(useCellsStore.getState().getNodes({conversationId: CONV_ID})[0]?.name).toBe('new-file.txt');
  });
});
