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

import {ReactNode} from 'react';

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {RestNode} from 'cells-sdk-ts';
import {noop} from 'noop-esm';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {getCellsFilesPath} from 'Components/conversation/conversationCells/common/getCellsFilesPath/getCellsFilesPath';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {CellNode} from 'src/script/types/cellNode';
import {translateForTest} from 'Util/test/translateForTest';

import {CellsMoveNodeModal} from './cellsMoveNodeModal';

const withTheme = (component: ReactNode) => {
  return <StyledApp themeId={THEME_ID.DEFAULT}>{component}</StyledApp>;
};

describe('CellsMoveNodeModal', () => {
  const conversationQualifiedId = {id: 'conversation-id', domain: 'wire.com'};
  const nodeToMove = {path: 'wire-cells-web/source/file.txt'} as CellNode;
  const destinationFolder = {
    Type: 'COLLECTION',
    Uuid: 'destination-folder',
    Path: 'wire-cells-web/destination',
  } as RestNode;
  let cellsRepository: jest.Mocked<CellsRepository>;
  let onClose: jest.Mock;
  let navigateToPath: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    cellsRepository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNode: jest.fn().mockResolvedValue(undefined),
      createFolder: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CellsRepository>;
    onClose = jest.fn();
    navigateToPath = jest.fn();
  });

  const renderMoveModal = (clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n})) => {
    const rootContext = createRootContextValueForTest({
      translate: translateForTest,
      fireAndForgetInvoker: createExecutingFireAndForgetInvokerForTest(),
      clock,
    });
    const wrapper = createRootProviderWrapperForTest(rootContext);

    return render(
      withTheme(
        <CellsMoveNodeModal
          isOpen
          onClose={onClose}
          cellsRepository={cellsRepository}
          conversationQualifiedId={conversationQualifiedId}
          conversationName="Engineering"
          nodeToMove={nodeToMove}
          navigateToPath={navigateToPath}
        />,
      ),
      {wrapper},
    );
  };

  it('navigates and closes after the existing single-item move succeeds', async () => {
    renderMoveModal();
    const moveButton = await screen.findByRole('button', {name: 'cells.moveNodeModal.moveButton'});
    await waitFor(() => {
      expect(moveButton).toBeEnabled();
    });

    fireEvent.click(moveButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(navigateToPath).toHaveBeenCalledWith({conversationQualifiedId, path: getCellsFilesPath()});
    expect(cellsRepository.moveNode).toHaveBeenCalledTimes(1);
  });

  it('keeps the modal open and shows an error when the single-item move fails', async () => {
    cellsRepository.moveNode.mockRejectedValue(new Error('move failed'));
    renderMoveModal();
    const moveButton = await screen.findByRole('button', {name: 'cells.moveNodeModal.moveButton'});
    await waitFor(() => {
      expect(moveButton).toBeEnabled();
    });

    fireEvent.click(moveButton);

    expect(await screen.findByRole('alert')).toHaveTextContent('cells.newItemMenuModalForm.genericError');
    expect(onClose).not.toHaveBeenCalled();
    expect(navigateToPath).not.toHaveBeenCalled();
  });

  it('shows loading and disables Move while destination folders reload', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    cellsRepository.getAllNodes.mockResolvedValueOnce({Nodes: [destinationFolder]});
    let resolveReload: (response: {Nodes: RestNode[]}) => void = noop;
    cellsRepository.getAllNodes.mockReturnValueOnce(
      new Promise(resolve => {
        resolveReload = resolve;
      }),
    );
    renderMoveModal(clock);
    const destinationButton = await screen.findByRole('button', {name: 'destination'});
    const moveButton = await screen.findByRole('button', {name: 'cells.moveNodeModal.moveButton'});
    await waitFor(() => {
      expect(moveButton).toBeEnabled();
    });

    fireEvent.click(destinationButton);
    await waitFor(() => {
      expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(2);
    });

    act(() => {
      clock.advanceByMilliseconds(999);
    });
    expect(screen.getByRole('status')).toHaveTextContent('cells.moveNodeModal.loading');
    expect(moveButton).toBeDisabled();
    expect(cellsRepository.moveNode).not.toHaveBeenCalled();

    await act(async () => {
      resolveReload({Nodes: []});
    });
    await waitFor(() => {
      expect(moveButton).toBeEnabled();
    });
  });

  it('returns to the folder picker and refreshes folders after creating a folder', async () => {
    renderMoveModal();
    fireEvent.click(await screen.findByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));

    fireEvent.change(screen.getByLabelText('cells.newItemMenuModal.labelFolder'), {
      target: {value: 'Reports'},
    });
    fireEvent.click(screen.getByRole('button', {name: 'cells.newItemMenuModal.primaryAction'}));
    await waitFor(() => {
      expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(2);
    });

    expect(cellsRepository.createFolder).toHaveBeenCalledWith({
      path: 'conversation-id@wire.com',
      name: 'Reports',
    });
    expect(screen.getByRole('button', {name: 'cells.moveNodeModal.moveButton'})).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(navigateToPath).not.toHaveBeenCalled();
  });

  it('keeps the folder form open and shows an error when folder creation fails', async () => {
    cellsRepository.createFolder.mockRejectedValue(new Error('folder creation failed'));
    renderMoveModal();
    fireEvent.click(await screen.findByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));

    fireEvent.change(screen.getByLabelText('cells.newItemMenuModal.labelFolder'), {
      target: {value: 'Reports'},
    });
    fireEvent.click(screen.getByRole('button', {name: 'cells.newItemMenuModal.primaryAction'}));

    expect(await screen.findByText('cells.newItemMenuModalForm.genericError')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'cells.newItemMenuModal.primaryAction'})).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(navigateToPath).not.toHaveBeenCalled();
  });
});
