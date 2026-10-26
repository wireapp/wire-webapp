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

import {render, screen, waitFor, within} from '@testing-library/react';
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

describe('CellsBulkMovePreviewModal', () => {
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

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'})).not.toBeInTheDocument();
  });
});
