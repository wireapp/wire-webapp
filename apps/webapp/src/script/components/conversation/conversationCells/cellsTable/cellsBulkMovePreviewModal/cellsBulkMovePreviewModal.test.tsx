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

import {act, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState, type FunctionComponent} from 'react';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {ThemeProvider} from '@wireapp/react-ui-kit';
import {Maybe} from 'true-myth';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {translateForTest} from 'Util/test/translateForTest';

import {CellsBulkMovePreviewModal} from './cellsBulkMovePreviewModal';

import {
  CELLS_SELF_USER_DRIVE_ROLE,
  CellsSelfUserDriveRoleProvider,
  type CellsSelfUserDriveRole,
} from '../../common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';

const viewerNode = {
  id: 'file-id',
  path: 'conversation-id@example.com/file.txt',
  name: 'file.txt',
  sizeMb: '1 MB',
  sizeBytes: Maybe.nothing(),
  uploadedAtTimestamp: 0,
  owner: 'Owner',
  conversationName: 'Conversation',
  tags: [],
  presignedUrlExpiresAt: null,
  user: null,
  selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
  extension: 'txt',
  type: CellNodeType.FILE,
} as unknown as CellNode;

function renderFolderCreationModal(createFolder: CellsRepository['createFolder']): {
  onClose: jest.Mock;
  getAllNodes: jest.Mock;
} {
  const onClose = jest.fn();
  const getAllNodes = jest.fn().mockResolvedValue({Nodes: []});
  const repository = {getAllNodes, createFolder} as unknown as CellsRepository;
  const wrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: translateForTest,
      fireAndForgetInvoker: createExecutingFireAndForgetInvokerForTest(),
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
    }),
  );

  render(
    <ThemeProvider>
      <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.EDITOR}>
        <CellsBulkMovePreviewModal
          isOpen
          onClose={onClose}
          selectedNodes={[viewerNode]}
          cellsRepository={repository}
          conversationQualifiedId={{id: 'conversation-id', domain: 'example.com'}}
          conversationName="Conversation"
          isMoveOutcomeUnresolved={false}
          isMoveRequestError={false}
          isMoveRequestPending={false}
          onMoveStart={jest.fn()}
          onMoveResult={() => {
            return false;
          }}
          onMoveError={jest.fn()}
          isBackgroundMovePending={false}
          isBackgroundMoveError={false}
          isBackgroundMoveRetryBlocked={false}
          isBackgroundMoveStatusUnknown={false}
          canRetryBackgroundMoveStatus={false}
          onRetryBackgroundMoveStatus={jest.fn()}
          onRefresh={jest.fn()}
        />
      </CellsSelfUserDriveRoleProvider>
    </ThemeProvider>,
    {wrapper},
  );

  return {onClose, getAllNodes};
}

describe('CellsBulkMovePreviewModal', () => {
  it.each(['success', 'failure'])('blocks Back and Close until folder creation finishes with %s', async outcome => {
    const user = userEvent.setup();
    const creation = Promise.withResolvers<Awaited<ReturnType<CellsRepository['createFolder']>>>();
    const createFolder = jest.fn().mockReturnValue(creation.promise);
    const {onClose, getAllNodes} = renderFolderCreationModal(createFolder);
    await user.click(await screen.findByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));
    await user.type(screen.getByLabelText('cells.newItemMenuModal.labelFolder'), 'New folder');

    await user.click(screen.getByRole('button', {name: 'cells.newItemMenuModal.primaryAction'}));
    expect(createFolder).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', {name: 'cells.newItemMenuModal.secondaryAction'}));
    await user.click(screen.getByRole('button', {name: 'cells.modal.closeButton'}));
    await user.keyboard('{Escape}');

    expect(screen.getByRole('heading', {name: 'cells.moveNodeModal.createTitle'})).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: 'cells.newItemMenuModal.primaryAction'})).toBeDisabled();

    await act(async () => {
      if (outcome === 'success') {
        creation.resolve({});
      } else {
        creation.reject(new Error('Folder creation failed'));
      }
    });

    if (outcome === 'success') {
      expect(screen.getByRole('heading', {name: 'cells.moveNodeModal.moveTitle'})).toBeInTheDocument();
      expect(getAllNodes).toHaveBeenCalledTimes(2);
    } else {
      expect(screen.getByText('cells.newItemMenuModalForm.genericError')).toBeInTheDocument();
      await user.click(screen.getByRole('button', {name: 'cells.newItemMenuModal.secondaryAction'}));
      expect(screen.getByRole('heading', {name: 'cells.moveNodeModal.moveTitle'})).toBeInTheDocument();
      await user.click(screen.getByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));
      expect(screen.getByLabelText('cells.newItemMenuModal.labelFolder')).toHaveValue('');
      expect(screen.queryByText('cells.newItemMenuModalForm.genericError')).not.toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', {name: 'cells.modal.closeButton'}));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clears the folder name and validation error when reopening Create from the picker', async () => {
    const user = userEvent.setup();
    const createFolder = jest.fn();
    renderFolderCreationModal(createFolder);
    await user.click(await screen.findByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));
    await user.type(screen.getByLabelText('cells.newItemMenuModal.labelFolder'), 'invalid/name');
    await user.click(screen.getByRole('button', {name: 'cells.newItemMenuModal.primaryAction'}));
    expect(screen.getByText('cells.nodeName.invalidCharactersError')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'cells.newItemMenuModal.secondaryAction'}));
    await user.click(screen.getByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));

    expect(screen.getByLabelText('cells.newItemMenuModal.labelFolder')).toHaveValue('');
    expect(screen.queryByText('cells.nodeName.invalidCharactersError')).not.toBeInTheDocument();
    expect(createFolder).not.toHaveBeenCalled();
  });

  it('clears the successful folder name when creating another folder', async () => {
    const user = userEvent.setup();
    const createFolder = jest.fn().mockResolvedValue({});
    renderFolderCreationModal(createFolder);
    await user.click(await screen.findByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));
    await user.type(screen.getByLabelText('cells.newItemMenuModal.labelFolder'), 'New folder');
    await user.click(screen.getByRole('button', {name: 'cells.newItemMenuModal.primaryAction'}));
    expect(createFolder).toHaveBeenCalledWith({path: 'conversation-id@example.com', name: 'New folder'});

    await user.click(await screen.findByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));

    expect(screen.getByLabelText('cells.newItemMenuModal.labelFolder')).toHaveValue('');
  });

  it('returns to the picker when the drive role changes to viewer', async () => {
    const user = userEvent.setup();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      createFolder: jest.fn(),
    } as unknown as CellsRepository;
    const wrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        fireAndForgetInvoker: createExecutingFireAndForgetInvokerForTest(),
        clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
      }),
    );
    const ModalWithChangeableRole: FunctionComponent = () => {
      const [role, setRole] = useState<CellsSelfUserDriveRole>(CELLS_SELF_USER_DRIVE_ROLE.EDITOR);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              return setRole(CELLS_SELF_USER_DRIVE_ROLE.VIEWER);
            }}
          >
            Set viewer
          </button>
          <CellsSelfUserDriveRoleProvider selfUserDriveRole={role}>
            <CellsBulkMovePreviewModal
              isOpen
              onClose={jest.fn()}
              selectedNodes={[viewerNode]}
              cellsRepository={repository}
              conversationQualifiedId={{id: 'conversation-id', domain: 'example.com'}}
              conversationName="Conversation"
              isMoveOutcomeUnresolved={false}
              isPartialMoveOutcome={false}
              isMoveRequestError={false}
              isMoveRequestPending={false}
              onMoveStart={jest.fn()}
              onMoveResult={() => {
                return false;
              }}
              onMoveError={jest.fn()}
              isBackgroundMovePending={false}
              isBackgroundMoveError={false}
              isBackgroundMoveRetryBlocked={false}
              isBackgroundMoveStatusUnknown={false}
              canRetryBackgroundMoveStatus={false}
              onRetryBackgroundMoveStatus={jest.fn()}
              onRefreshAfterBulkMoveOutcome={jest.fn()}
              isRefreshingBulkMoveOutcome={false}
            />
          </CellsSelfUserDriveRoleProvider>
        </>
      );
    };

    render(
      <ThemeProvider>
        <ModalWithChangeableRole />
      </ThemeProvider>,
      {wrapper},
    );

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));
    expect(within(dialog).getByRole('heading', {name: 'cells.moveNodeModal.createTitle'})).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Set viewer'}));

    await waitFor(() => {
      expect(within(dialog).getByRole('heading', {name: 'cells.moveNodeModal.moveTitle'})).toBeInTheDocument();
    });
    expect(within(dialog).queryByLabelText('cells.newItemMenuModal.labelFolder')).not.toBeInTheDocument();
    expect(repository.createFolder).not.toHaveBeenCalled();
  });

  it('does not offer folder creation when the current drive role is viewer', async () => {
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
    } as unknown as CellsRepository;
    const wrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        fireAndForgetInvoker: createExecutingFireAndForgetInvokerForTest(),
        clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
      }),
    );

    render(
      <ThemeProvider>
        <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.VIEWER}>
          <CellsBulkMovePreviewModal
            isOpen
            onClose={jest.fn()}
            selectedNodes={[viewerNode]}
            cellsRepository={repository}
            conversationQualifiedId={{id: 'conversation-id', domain: 'example.com'}}
            conversationName="Conversation"
            isMoveOutcomeUnresolved={false}
            isPartialMoveOutcome={false}
            isMoveRequestError={false}
            isMoveRequestPending={false}
            onMoveStart={jest.fn()}
            onMoveResult={() => {
              return false;
            }}
            onMoveError={jest.fn()}
            isBackgroundMovePending={false}
            isBackgroundMoveError={false}
            isBackgroundMoveRetryBlocked={false}
            isBackgroundMoveStatusUnknown={false}
            canRetryBackgroundMoveStatus={false}
            onRetryBackgroundMoveStatus={jest.fn()}
            onRefreshAfterBulkMoveOutcome={jest.fn()}
            isRefreshingBulkMoveOutcome={false}
          />
        </CellsSelfUserDriveRoleProvider>
      </ThemeProvider>,
      {wrapper},
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'})).not.toBeInTheDocument();
  });
});
