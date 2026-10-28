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
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {RestNode} from 'cells-sdk-ts';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {translateForTest} from 'Util/test/translateForTest';

import {useBulkMoveDestinationSelection} from './useBulkMoveDestinationSelection';

const initialConversationQualifiedId: QualifiedId = {id: 'conversation-id', domain: 'wire.com'};
const selectedFolder = {
  id: 'selected-folder',
  path: 'conversation-id@wire.com/Drive/Selected',
  type: CellNodeType.FOLDER,
} as CellNode;
const destinationFolder = {
  Type: 'COLLECTION',
  Uuid: 'destination-folder',
  Path: 'conversation-id@wire.com/Drive/Destination',
} as RestNode;
const selectedNodes = [selectedFolder];

type CreateHookWrapperResult = ReturnType<typeof createRootProviderWrapperForTest>;

const createHookWrapper = (): CreateHookWrapperResult => {
  return createRootProviderWrapperForTest(
    createRootContextValueForTest({
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
      fireAndForgetInvoker: createExecutingFireAndForgetInvokerForTest(),
      translate: translateForTest,
    }),
  );
};

describe('useBulkMoveDestinationSelection', () => {
  it('keeps normalized folder and disabled destination references stable for an equivalent qualified ID', async () => {
    const cellsRepository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: [destinationFolder]}),
    } as unknown as CellsRepository;
    const {result, rerender} = renderHook(
      ({conversationQualifiedId}: {conversationQualifiedId: QualifiedId}) => {
        return useBulkMoveDestinationSelection({
          isOpen: true,
          selectedNodes,
          cellsRepository,
          conversationQualifiedId,
        });
      },
      {
        initialProps: {conversationQualifiedId: initialConversationQualifiedId},
        wrapper: createHookWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    const folders = result.current.folders;
    const disabledDestinationPaths = result.current.disabledDestinationPaths;
    const disabledDestinationLabels = result.current.disabledDestinationLabels;

    rerender({conversationQualifiedId: {...initialConversationQualifiedId}});

    expect(result.current.folders).toBe(folders);
    expect(result.current.disabledDestinationPaths).toBe(disabledDestinationPaths);
    expect(result.current.disabledDestinationLabels).toBe(disabledDestinationLabels);
    expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(1);
  });

  it('recomputes normalized paths when the qualified ID or domain changes', async () => {
    const cellsRepository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: [destinationFolder]}),
    } as unknown as CellsRepository;
    const {result, rerender} = renderHook(
      ({conversationQualifiedId}: {conversationQualifiedId: QualifiedId}) => {
        return useBulkMoveDestinationSelection({
          isOpen: true,
          selectedNodes,
          cellsRepository,
          conversationQualifiedId,
        });
      },
      {
        initialProps: {conversationQualifiedId: initialConversationQualifiedId},
        wrapper: createHookWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    const originalFolders = result.current.folders;
    const originalDisabledDestinationPaths = result.current.disabledDestinationPaths;
    expect(originalFolders[0]?.path).toBe('Drive/Destination');
    expect(originalDisabledDestinationPaths).toEqual(['Drive/Selected', 'Drive']);

    rerender({conversationQualifiedId: {id: 'conversation-id', domain: 'example.com'}});

    await waitFor(() => {
      expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(2);
    });
    expect(result.current.folders).not.toBe(originalFolders);
    expect(result.current.folders[0]?.path).toBe('conversation-id@wire.com/Drive/Destination');
    expect(result.current.disabledDestinationPaths).not.toBe(originalDisabledDestinationPaths);
    expect(result.current.disabledDestinationPaths).toEqual([
      'conversation-id@wire.com/Drive/Selected',
      'conversation-id@wire.com/Drive',
    ]);

    const domainChangedFolders = result.current.folders;
    const domainChangedDisabledDestinationPaths = result.current.disabledDestinationPaths;
    rerender({conversationQualifiedId: {id: 'another-conversation', domain: 'example.com'}});

    await waitFor(() => {
      expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(3);
    });
    expect(result.current.folders).not.toBe(domainChangedFolders);
    expect(result.current.folders[0]?.path).toBe('conversation-id@wire.com/Drive/Destination');
    expect(result.current.disabledDestinationPaths).not.toBe(domainChangedDisabledDestinationPaths);
    expect(result.current.disabledDestinationPaths).toEqual([
      'conversation-id@wire.com/Drive/Selected',
      'conversation-id@wire.com/Drive',
    ]);
  });
});
