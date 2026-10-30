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

import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import type {ReactElement} from 'react';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import userEvent from '@testing-library/user-event';
import {noop} from 'noop-esm';

import {ThemeProvider, themes, THEME_ID} from '@wireapp/react-ui-kit';
import {Maybe} from 'true-myth';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {Conversation} from 'Repositories/entity/Conversation';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {driveBulkActionsFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import type {Translate} from 'Util/localizerUtil/translationTypes';
import {translateForTest} from 'Util/test/translateForTest';
import type {SharedDriveUploadController} from 'Components/conversation/conversationCells/sharedDriveUploadController';
import {SharedDriveUploadStatusProvider} from 'Components/conversation/conversationCells/sharedDriveUploadStatusContext';
import {SharedDriveUploadStatusPopupHost} from 'Components/conversation/conversationCells/sharedDriveUploadStatusPopupHost';

import {CellsTable} from './cellsTable';

import {
  CELLS_SELF_USER_DRIVE_ROLE,
  CellsSelfUserDriveRoleProvider,
  CellsSelfUserDriveRole,
} from '../common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';

const translateSelectionForTest: Translate = (key, substitutions) => {
  if (key === 'cells.selection.selectedCount') {
    return `${substitutions?.count} selected`;
  }
  if (key === 'cells.selection.selectItem') {
    return `Select ${substitutions?.name}`;
  }
  if (key === 'cells.selection.clear') {
    return 'Clear selection';
  }
  if (key === 'cells.selection.move') {
    return 'Move';
  }
  if (key === 'cells.selection.moveToBin') {
    return 'Move to bin';
  }
  if (key === 'cells.bulkMoveToBin.confirmation.title') {
    return 'Move selected items to Bin?';
  }
  if (key === 'cells.bulkMoveToBin.confirmation.description') {
    return `Move ${substitutions?.count} selected items to Bin. Selected folders and their contents will also move to Bin.`;
  }
  if (key === 'cells.bulkMoveToBin.destination') {
    return 'Bin';
  }
  if (key === 'cells.bulkMoveToBin.moving') {
    return `Moving ${substitutions?.count} selected items to Bin`;
  }
  if (key === 'cells.bulkMoveToBin.requestFailed') {
    return 'The request result is unknown. Refresh Drive and Bin before trying again.';
  }
  if (key === 'cells.bulkMoveToBin.refresh') {
    return 'Refresh Drive and Bin';
  }
  if (key === 'cells.bulkMoveToBin.refreshFailed') {
    return 'Could not refresh Drive and Bin. The result is still unknown.';
  }
  if (key === 'cells.bulkMoveToBin.confirmation.cancel') {
    return 'Cancel';
  }
  if (key === 'cells.bulkMoveToBin.confirmation.confirm') {
    return 'Move to Bin';
  }
  if (key === 'cells.moveNodeModal.moveTitle') {
    return 'Move to folder';
  }
  if (key === 'cells.moveNodeModal.createTitle') {
    return 'Create Folder';
  }
  if (key === 'cells.bulkMove.moveButton') {
    return 'Move';
  }
  if (key === 'cells.bulkMove.movingItems') {
    return `Moving ${substitutions?.count} items`;
  }
  if (key === 'cells.bulkMove.movedItems') {
    return `Moved ${substitutions?.count} items`;
  }
  if (key === 'cells.bulkMove.processing') {
    return 'Processing';
  }
  if (key === 'cells.bulkMove.completed') {
    return 'Move completed';
  }
  if (key === 'cells.uploadStatus.destination') {
    return `to ${substitutions?.destination}`;
  }
  if (key === 'cells.bulkMove.outcomeUnresolved') {
    return 'Move status is unresolved. Verify the Drive before trying again.';
  }
  if (key === 'cells.bulkMove.requestFailed') {
    return 'The move request failed. Some items may have moved. Refresh Drive to check item locations before trying again.';
  }
  if (key === 'cells.bulkMove.finishedUnknown') {
    return 'The move job finished, but item locations are unknown. Refresh Drive to check before trying again.';
  }
  if (key === 'cells.bulkMove.allJobsFailed') {
    return 'The move jobs failed or were interrupted. Refresh Drive to check item locations before trying again.';
  }
  if (key === 'cells.bulkMove.statusLookupUnknown') {
    return 'The move status could not be checked. Refresh Drive to check item locations before trying again.';
  }
  if (key === 'cells.bulkMove.partialMoveWarning') {
    return 'The move may be incomplete. Check item locations before trying again. Move stays disabled in this view.';
  }
  if (key === 'cells.bulkMove.selected') {
    return 'Selected';
  }
  if (key === 'cells.bulkMove.currentLocation') {
    return 'Current location';
  }
  if (key === 'cells.moveNodeModal.openFolder') {
    return `Open ${substitutions?.folderName}`;
  }
  return translateForTest(key);
};

const conversationQualifiedId = {id: 'conversation-id', domain: 'example.com'};
const uploadStatusController = {
  snapshots: () => {
    return [];
  },
  subscribe: () => {
    return noop;
  },
} as unknown as SharedDriveUploadController;

const createNode = (overrides: Partial<CellNode>): CellNode => {
  return {
    id: 'node-id',
    path: 'node-name',
    name: 'Node name',
    sizeMb: '1 MB',
    sizeBytes: Maybe.nothing(),
    uploadedAtTimestamp: 0,
    owner: 'Owner',
    conversationName: 'Conversation',
    tags: [],
    presignedUrlExpiresAt: null,
    user: null,
    selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.EDITOR,
    extension: '',
    type: CellNodeType.FOLDER,
    ...overrides,
  };
};

const createDataTransfer = (files: readonly File[]): DataTransfer => {
  return {
    dropEffect: 'none',
    files,
    types: ['Files'],
  } as unknown as DataTransfer;
};

const renderCellsTable = ({
  folderPath = 'conversation-id@example.com/Marketing/images',
  onDropFilesToFolder = jest.fn(),
  onDropReadError = jest.fn(),
  onFolderDropTargetChange = jest.fn(),
  folderDropResetKey,
  selectionEnabled = true,
  selectionScopeKey = 'conversation:/files',
  isBulkActionsEnabled = true,
  cellsRepository = {} as CellsRepository,
  initialNodes,
  selfUserDriveRole = CELLS_SELF_USER_DRIVE_ROLE.EDITOR,
  onRefresh = jest.fn(),
  onRefreshAfterBulkMoveOutcome = jest.fn().mockResolvedValue(true),
  onRefreshAfterBulkMoveToBinOutcome = jest.fn().mockResolvedValue(true),
  clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
  random = () => {
    return 0.5;
  },
  selectionBarAnchor = document.body,
  themeId = THEME_ID.DEFAULT,
}: {
  readonly folderPath?: string;
  readonly onDropFilesToFolder?: (files: readonly File[], uploadPath: string) => void;
  readonly onDropReadError?: () => void;
  readonly onFolderDropTargetChange?: (folderName: string | null) => void;
  readonly folderDropResetKey?: number;
  readonly selectionEnabled?: boolean;
  readonly selectionScopeKey?: string;
  readonly isBulkActionsEnabled?: boolean;
  readonly cellsRepository?: CellsRepository;
  readonly initialNodes?: CellNode[];
  readonly onRefresh?: () => void;
  readonly onRefreshAfterBulkMoveOutcome?: () => Promise<boolean>;
  readonly onRefreshAfterBulkMoveToBinOutcome?: () => Promise<boolean>;
  readonly selfUserDriveRole?: CellsSelfUserDriveRole;
  readonly clock?: ReturnType<typeof createDeterministicClock>;
  readonly random?: () => number;
  readonly selectionBarAnchor?: HTMLElement | null;
  readonly themeId?: THEME_ID;
} = {}): {
  file: CellNode;
  folder: CellNode;
  onDropFilesToFolder: (files: readonly File[], uploadPath: string) => void;
  onDropReadError: () => void;
  onFolderDropTargetChange: (folderName: string | null) => void;
  unmount: () => void;
  rerenderWithResetKey: (resetKey: number) => void;
  rerenderWithSelectionScope: (scopeKey: string, isSelectionEnabled?: boolean) => void;
  rerenderWithNodes: (nodes: CellNode[]) => void;
} => {
  const wrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: translateSelectionForTest,
      fireAndForgetInvoker: createExecutingFireAndForgetInvokerForTest(),
      clock,
      isFeatureToggleEnabled: featureToggleName => {
        return isBulkActionsEnabled && featureToggleName === driveBulkActionsFeatureToggleName;
      },
    }),
  );
  const folder = createNode({id: 'folder-id', name: 'Marketing images', path: folderPath});
  const file = createNode({
    id: 'file-id',
    name: 'Wire logs.pdf',
    path: 'Wire logs.pdf',
    type: CellNodeType.FILE,
    extension: 'pdf',
  });

  const renderTable = (
    resetKey = folderDropResetKey,
    scopeKey = selectionScopeKey,
    isSelectionEnabled = selectionEnabled,
    nodes = initialNodes ?? [folder, file],
  ): ReactElement => {
    return (
      <ThemeProvider theme={themes[themeId]}>
        <SharedDriveUploadStatusProvider>
          <CellsSelfUserDriveRoleProvider selfUserDriveRole={selfUserDriveRole}>
            <CellsTable
              nodes={nodes}
              cellsRepository={cellsRepository}
              conversation={{} as Conversation}
              conversationQualifiedId={conversationQualifiedId}
              conversationName="Conversation"
              onRefresh={onRefresh}
              onRefreshAfterBulkMoveOutcome={onRefreshAfterBulkMoveOutcome}
              onRefreshAfterBulkMoveToBinOutcome={onRefreshAfterBulkMoveToBinOutcome}
              onFolderDropTargetChange={onFolderDropTargetChange}
              onDropFilesToFolder={onDropFilesToFolder}
              onDropReadError={onDropReadError}
              folderDropResetKey={resetKey}
              getDirectionFor={() => {
                return undefined;
              }}
              isSortingEnabled
              onToggleSort={jest.fn()}
              selectionEnabled={isSelectionEnabled}
              selectionScopeKey={scopeKey}
              selectionBarAnchor={selectionBarAnchor}
              random={random}
            />
          </CellsSelfUserDriveRoleProvider>
          <SharedDriveUploadStatusPopupHost
            controller={uploadStatusController}
            conversationQualifiedId={`${conversationQualifiedId.id}@${conversationQualifiedId.domain}`}
            isEnabled
            isFileTabActive
          />
        </SharedDriveUploadStatusProvider>
      </ThemeProvider>
    );
  };

  const {rerender, unmount} = render(renderTable(), {wrapper});

  return {
    file,
    folder,
    onDropFilesToFolder,
    onDropReadError,
    onFolderDropTargetChange,
    unmount,
    rerenderWithResetKey: (resetKey: number) => {
      return rerender(renderTable(resetKey));
    },
    rerenderWithSelectionScope: (scopeKey: string, isSelectionEnabled = selectionEnabled) => {
      return rerender(renderTable(folderDropResetKey, scopeKey, isSelectionEnabled));
    },
    rerenderWithNodes: (nodes: CellNode[]) => {
      return rerender(renderTable(folderDropResetKey, selectionScopeKey, selectionEnabled, nodes));
    },
  };
};

describe('CellsTable selection', () => {
  it('shows the precise total for selected files and clears it with the selection', () => {
    const files = [
      createNode({id: 'first-file', type: CellNodeType.FILE, sizeBytes: Maybe.just(104857600)}),
      createNode({id: 'second-file', type: CellNodeType.FILE, sizeBytes: Maybe.just(129918566)}),
    ];
    renderCellsTable({initialNodes: files});

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getAllByRole('checkbox')[1]);

    expect(within(screen.getByRole('status')).getByText('2 selected')).toBeInTheDocument();
    expect(within(screen.getByRole('status')).getByText('223.9 MB')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Move'})).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Clear selection'}));
    expect(screen.queryByText('223.9 MB')).not.toBeInTheDocument();
  });

  it('omits the total when the selected files would overflow a safe integer', () => {
    const files = [
      createNode({id: 'first-file', type: CellNodeType.FILE, sizeBytes: Maybe.just(Number.MAX_SAFE_INTEGER)}),
      createNode({id: 'second-file', type: CellNodeType.FILE, sizeBytes: Maybe.just(1)}),
    ];
    renderCellsTable({initialNodes: files});

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getAllByRole('checkbox')[1]);

    expect(within(screen.getByRole('status')).getByText('2 selected')).toBeInTheDocument();
    expect(within(screen.getByRole('status')).queryByText(/\d+(\.\d+)? (B|KB|MB|GB)/)).not.toBeInTheDocument();
  });

  it.each([
    {label: 'a folder', node: createNode({id: 'folder', type: CellNodeType.FOLDER, sizeBytes: Maybe.just(1048576)})},
    {label: 'a file with unknown size', node: createNode({id: 'unknown', type: CellNodeType.FILE})},
  ])('omits the selected size when the selection contains $label', ({node}) => {
    renderCellsTable({initialNodes: [node]});

    fireEvent.click(screen.getByRole('checkbox'));

    const selectionStatus = screen.getByRole('status');
    expect(within(selectionStatus).getByText('1 selected')).toBeInTheDocument();
    expect(within(selectionStatus).queryByText(/\d+(\.\d+)? (B|KB|MB|GB)/)).not.toBeInTheDocument();
  });

  it('opens a captured mixed-selection confirmation and cancels without deleting', async () => {
    const user = userEvent.setup();
    const repository = {deleteNodes: jest.fn()} as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('checkbox', {name: 'Select Wire logs.pdf'}));
    await user.click(screen.getByRole('button', {name: 'Move to bin'}));

    const confirmation = await screen.findByRole('dialog');
    expect(within(confirmation).getByRole('heading', {name: 'Move selected items to Bin?'})).toBeInTheDocument();
    expect(within(confirmation).getByText(/Move 2 selected items to Bin/)).toBeInTheDocument();
    expect(within(confirmation).getByText(/Selected folders and their contents/)).toBeInTheDocument();

    await user.click(within(confirmation).getByRole('button', {name: 'Cancel'}));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(repository.deleteNodes).not.toHaveBeenCalled();
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('revalidates delete permission when confirming the captured selection', async () => {
    const user = userEvent.setup();
    const deleteNodes = jest.fn();
    const view = renderCellsTable({cellsRepository: {deleteNodes} as unknown as CellsRepository});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('checkbox', {name: 'Select Wire logs.pdf'}));
    await user.click(screen.getByRole('button', {name: 'Move to bin'}));
    const confirmation = await screen.findByRole('dialog');
    view.rerenderWithNodes([{...view.folder, selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER}, view.file]);
    await user.click(within(confirmation).getByRole('button', {name: 'Move to Bin'}));

    expect(deleteNodes).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('submits the captured selection once with existing non-permanent batch semantics', async () => {
    const user = userEvent.setup();
    const deleteNodes = jest.fn().mockResolvedValue({Status: 'Performed'});
    const onRefreshAfterBulkMoveToBinOutcome = jest.fn().mockResolvedValue(true);
    const repository = {deleteNodes} as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository, onRefreshAfterBulkMoveToBinOutcome});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('checkbox', {name: 'Select Wire logs.pdf'}));
    await user.click(screen.getByRole('button', {name: 'Move to bin'}));
    const confirmation = await screen.findByRole('dialog');
    await user.click(within(confirmation).getByRole('button', {name: 'Move to Bin'}));

    await waitFor(() => {
      expect(deleteNodes).toHaveBeenCalledTimes(1);
    });
    expect(deleteNodes).toHaveBeenCalledWith({uuids: ['folder-id', 'file-id'], permanently: false});
    await waitFor(() => {
      expect(onRefreshAfterBulkMoveToBinOutcome).toHaveBeenCalledTimes(1);
    });
  });

  it('prevents duplicate batch submissions while the request is pending', async () => {
    const user = userEvent.setup();
    let resolveDelete: (response: {Status: string}) => void = () => {
      return undefined;
    };
    const pendingDelete = new Promise<{Status: string}>(resolve => {
      resolveDelete = resolve;
    });
    const deleteNodes = jest.fn().mockReturnValue(pendingDelete);
    const onRefreshAfterBulkMoveToBinOutcome = jest.fn().mockResolvedValue(true);
    renderCellsTable({
      cellsRepository: {deleteNodes} as unknown as CellsRepository,
      onRefreshAfterBulkMoveToBinOutcome,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move to bin'}));
    const confirmation = await screen.findByRole('dialog');
    const confirmButton = within(confirmation).getByRole('button', {name: 'Move to Bin'});
    await user.click(confirmButton);
    expect(confirmButton).toBeDisabled();
    expect(within(confirmation).queryByText('Moving 1 selected items to Bin')).not.toBeInTheDocument();
    await user.click(within(confirmation).getByRole('button', {name: 'Cancel'}));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(confirmButton);
    expect(deleteNodes).toHaveBeenCalledTimes(1);

    resolveDelete({Status: 'Performed'});
    await waitFor(() => {
      expect(onRefreshAfterBulkMoveToBinOutcome).toHaveBeenCalledTimes(1);
    });
  });

  it('does not apply a pending result to a newly navigated selection scope', async () => {
    const user = userEvent.setup();
    let resolveDelete: (response: {Status: string}) => void = () => {
      return undefined;
    };
    const pendingDelete = new Promise<{Status: string}>(resolve => {
      resolveDelete = resolve;
    });
    const deleteNodes = jest.fn().mockReturnValue(pendingDelete);
    const onRefreshAfterBulkMoveToBinOutcome = jest.fn().mockResolvedValue(true);
    const view = renderCellsTable({
      cellsRepository: {deleteNodes} as unknown as CellsRepository,
      onRefreshAfterBulkMoveToBinOutcome,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move to bin'}));
    const confirmation = await screen.findByRole('dialog');
    await user.click(within(confirmation).getByRole('button', {name: 'Move to Bin'}));
    view.rerenderWithSelectionScope('conversation:/files/subfolder');

    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    resolveDelete({Status: 'Performed'});

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')[0]).toBeEnabled();
    });
    expect(deleteNodes).toHaveBeenCalledTimes(1);
    expect(onRefreshAfterBulkMoveToBinOutcome).not.toHaveBeenCalled();
  });

  it('does not retry the batch mutation after a request error', async () => {
    const user = userEvent.setup();
    const deleteNodes = jest.fn().mockRejectedValue(new Error('network unavailable'));
    const onRefreshAfterBulkMoveToBinOutcome = jest.fn().mockResolvedValue(true);
    renderCellsTable({
      cellsRepository: {deleteNodes} as unknown as CellsRepository,
      onRefreshAfterBulkMoveToBinOutcome,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move to bin'}));
    const confirmation = await screen.findByRole('dialog');
    await user.click(within(confirmation).getByRole('button', {name: 'Move to Bin'}));

    await waitFor(() => {
      expect(onRefreshAfterBulkMoveToBinOutcome).toHaveBeenCalledTimes(1);
    });
    expect(deleteNodes).toHaveBeenCalledTimes(1);
    expect(deleteNodes).toHaveBeenCalledWith({uuids: ['folder-id'], permanently: false});
  });

  it('keeps the selection locked when refreshing the action outcome fails', async () => {
    const user = userEvent.setup();
    const deleteNodes = jest.fn().mockResolvedValue({Status: 'Performed'});
    const onRefreshAfterBulkMoveToBinOutcome = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    renderCellsTable({
      cellsRepository: {deleteNodes} as unknown as CellsRepository,
      onRefreshAfterBulkMoveToBinOutcome,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move to bin'}));
    const confirmation = await screen.findByRole('dialog');
    await user.click(within(confirmation).getByRole('button', {name: 'Move to Bin'}));

    const refreshButton = await screen.findByRole('button', {name: 'Refresh Drive and Bin'});
    expect(screen.getByText('Could not refresh Drive and Bin. The result is still unknown.')).toBeInTheDocument();
    await user.click(refreshButton);

    await waitFor(() => {
      expect(onRefreshAfterBulkMoveToBinOutcome).toHaveBeenCalledTimes(2);
    });
    expect(deleteNodes).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Could not refresh Drive and Bin. The result is still unknown.')).not.toBeInTheDocument();
  });

  it('polls delete background jobs and refreshes after they finish', async () => {
    const user = userEvent.setup();
    const deleteNodes = jest.fn().mockResolvedValue({
      Status: 'Background',
      BackgroundActions: [{Name: 'delete', JobUuid: 'delete-job'}],
    });
    const getBackgroundActionInfo = jest.fn().mockResolvedValue({Status: 'Finished'});
    const onRefreshAfterBulkMoveToBinOutcome = jest.fn().mockResolvedValue(true);
    renderCellsTable({
      cellsRepository: {deleteNodes, getBackgroundActionInfo} as unknown as CellsRepository,
      onRefreshAfterBulkMoveToBinOutcome,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move to bin'}));
    const confirmation = await screen.findByRole('dialog');
    await user.click(within(confirmation).getByRole('button', {name: 'Move to Bin'}));

    await waitFor(() => {
      expect(onRefreshAfterBulkMoveToBinOutcome).toHaveBeenCalledTimes(1);
    });
    expect(deleteNodes).toHaveBeenCalledTimes(1);
    expect(getBackgroundActionInfo).toHaveBeenCalledWith({name: 'delete', jobUuid: 'delete-job'});
  });

  it('selects files and folders and clears the selection', () => {
    renderCellsTable();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
    expect(checkboxes[0]).toHaveAccessibleName('Select Marketing images');

    fireEvent.click(checkboxes[0]);
    expect(screen.getByRole('button', {name: 'Move'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Move'})).toHaveStyle({pointerEvents: 'auto'});
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByRole('row', {name: /Marketing images/})).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', {name: 'Clear selection'})).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
    expect(screen.getAllByRole('checkbox')[1]).toBeChecked();

    fireEvent.click(screen.getByRole('button', {name: 'Clear selection'}));
    expect(screen.queryByRole('button', {name: 'Clear selection'})).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('checkbox').every(checkbox => {
        return !(checkbox as HTMLInputElement).checked;
      }),
    ).toBe(true);
  });

  it('keeps selection but hides Move in the recycle bin', () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/recycle_bin';
    try {
      renderCellsTable({selectionScopeKey: 'conversation:/bin'});
      fireEvent.click(screen.getAllByRole('checkbox')[0]);

      expect(screen.getByText('1 selected')).toBeInTheDocument();
      expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
      expect(screen.queryByRole('button', {name: 'Move to bin'})).not.toBeInTheDocument();
    } finally {
      window.location.hash = originalHash;
    }
  });

  it('hides Move for viewers while keeping selection available', () => {
    renderCellsTable({selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER});
    fireEvent.click(screen.getAllByRole('checkbox')[0]);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Move to bin'})).not.toBeInTheDocument();
  });

  it('hides selection controls when the Drive bulk actions feature flag is off', () => {
    renderCellsTable({isBulkActionsEnabled: false});

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Clear selection'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Move to bin'})).not.toBeInTheDocument();
  });

  it('browses destinations without listing selected items, moving, or clearing selection', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
    const user = userEvent.setup();
    const repository = {
      getAllNodes: jest
        .fn()
        .mockResolvedValueOnce({
          Nodes: [
            {Type: 'COLLECTION', Uuid: 'source-folder', Path: 'wire-cells-web/Marketing images'},
            {Type: 'COLLECTION', Uuid: 'design-reviews', Path: 'wire-cells-web/Design reviews'},
            {Type: 'COLLECTION', Uuid: 'legal', Path: 'wire-cells-web/Legal'},
          ],
        })
        .mockResolvedValueOnce({
          Nodes: [
            {Type: 'COLLECTION', Uuid: 'quarterly-reviews', Path: 'wire-cells-web/Design reviews/Quarterly reviews'},
          ],
        })
        .mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn(),
    } as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository, folderPath: 'wire-cells-web/Marketing images'});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('checkbox', {name: 'Select Wire logs.pdf'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));

    const preview = await screen.findByRole('dialog');
    expect(within(preview).getByRole('heading', {name: 'Move to folder'})).toBeInTheDocument();
    expect(
      within(preview).queryByText('Choose a destination in this conversation’s Drive, then move the selected items.'),
    ).not.toBeInTheDocument();
    expect(within(preview).queryByText(/Current destination:/)).not.toBeInTheDocument();
    expect(within(preview).getByRole('button', {name: 'cells.breadcrumb.files'})).toBeInTheDocument();
    expect(within(preview).queryByRole('region', {name: 'Selected items'})).not.toBeInTheDocument();
    expect(within(preview).queryByText('Wire logs.pdf')).not.toBeInTheDocument();
    expect(within(preview).getByRole('button', {name: 'Move'})).toBeEnabled();

    const selectedSourceFolder = await within(preview).findByRole('button', {name: 'Marketing images Selected'});
    expect(selectedSourceFolder).toBeDisabled();
    await user.click(await within(preview).findByRole('button', {name: 'Design reviews'}));
    expect(within(preview).getByRole('button', {name: 'Design reviews'})).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(preview).getByRole('button', {name: 'Open Design reviews'}));
    const designReviewsBreadcrumbs = within(preview).getAllByRole('list')[0];
    expect(within(designReviewsBreadcrumbs).getByText('Design reviews')).toBeInTheDocument();
    await user.click(await within(preview).findByRole('button', {name: 'Open Quarterly reviews'}));
    const quarterlyReviewsBreadcrumbs = within(preview).getAllByRole('list')[0];
    expect(within(quarterlyReviewsBreadcrumbs).getByText('Quarterly reviews')).toBeInTheDocument();
    await waitFor(() => {
      expect(repository.getAllNodes).toHaveBeenCalledTimes(3);
    });
    expect(repository.moveNodes).not.toHaveBeenCalled();

    await user.click(within(preview).getByRole('button', {name: 'cells.moveNodeModal.cancelButton'}));

    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(
      screen.getAllByRole('checkbox').every(checkbox => {
        return (checkbox as HTMLInputElement).checked;
      }),
    ).toBe(true);

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const reopenedPreview = await screen.findByRole('dialog');
    expect(within(reopenedPreview).getByRole('heading', {name: 'Move to folder'})).toBeInTheDocument();
    expect(within(reopenedPreview).getByRole('button', {name: 'cells.breadcrumb.files'})).toBeInTheDocument();
    expect(within(reopenedPreview).queryByRole('region', {name: 'Selected items'})).not.toBeInTheDocument();
    expect(within(reopenedPreview).queryByText('Wire logs.pdf')).not.toBeInTheDocument();
    await user.click(within(reopenedPreview).getByRole('button', {name: 'cells.moveNodeModal.cancelButton'}));

    expect(repository.moveNodes).not.toHaveBeenCalled();
    window.location.hash = originalHash;
  });

  it('creates a folder, refreshes the picker, and moves only after selecting it', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const repository = {
      getAllNodes: jest
        .fn()
        .mockResolvedValueOnce({Nodes: []})
        .mockResolvedValueOnce({
          Nodes: [{Type: 'COLLECTION', Uuid: 'reports', Path: 'conversation-id@example.com/Reports'}],
        }),
      createFolder: jest.fn().mockResolvedValue(undefined),
      moveNodes: jest.fn().mockResolvedValue({
        Status: 'Performed',
        AffectedNodes: [{Path: 'conversation-id@example.com/Reports/Wire logs.pdf', Uuid: 'file-id'}],
      }),
    } as unknown as CellsRepository;
    const selectedFile = createNode({
      id: 'file-id',
      name: 'Wire logs.pdf',
      path: 'conversation-id@example.com/Wire logs.pdf',
      type: CellNodeType.FILE,
      extension: 'pdf',
    });
    renderCellsTable({cellsRepository: repository, initialNodes: [selectedFile], onRefresh});

    await user.click(screen.getByRole('checkbox', {name: 'Select Wire logs.pdf'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));
    expect(within(dialog).getByRole('heading', {name: 'Create Folder'})).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('cells.newItemMenuModal.labelFolder'), 'Reports');
    await user.click(within(dialog).getByRole('button', {name: 'cells.newItemMenuModal.primaryAction'}));

    await waitFor(() => {
      expect(repository.createFolder).toHaveBeenCalledWith({
        path: 'conversation-id@example.com',
        name: 'Reports',
      });
    });
    const reportsFolder = await within(dialog).findByRole('button', {name: 'Reports'});
    expect(reportsFolder).toHaveAttribute('aria-pressed', 'false');
    expect(repository.moveNodes).not.toHaveBeenCalled();
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    await user.click(reportsFolder);
    expect(reportsFolder).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));

    await waitFor(() => {
      expect(repository.moveNodes).toHaveBeenCalledWith({
        currentPaths: ['conversation-id@example.com/Wire logs.pdf'],
        targetPath: 'conversation-id@example.com/Reports',
      });
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    window.location.hash = originalHash;
  });

  it('warns when only some affected nodes are reported without naming failed items', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/Drive';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const breadcrumbAnchor = document.createElement('div');
    document.body.appendChild(breadcrumbAnchor);
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue({
        Status: 'Performed',
        BackgroundActions: [{Name: 'move', JobUuid: 'move-job', Status: 'Finished'}],
        AffectedNodes: [{Path: 'Drive/Moved.pdf', Uuid: 'moved'}],
      }),
    } as unknown as CellsRepository;
    const selectedFiles = [
      createNode({
        id: 'moved',
        name: 'Moved.pdf',
        path: 'conversation-id@example.com/Drive/Moved.pdf',
        type: CellNodeType.FILE,
      }),
      createNode({
        id: 'not-reported',
        name: 'Not reported.pdf',
        path: 'conversation-id@example.com/Drive/Not reported.pdf',
        type: CellNodeType.FILE,
      }),
    ];
    renderCellsTable({
      cellsRepository: repository,
      initialNodes: selectedFiles,
      onRefresh,
      selectionBarAnchor: breadcrumbAnchor,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Moved.pdf'}));
    await user.click(screen.getByRole('checkbox', {name: 'Select Not reported.pdf'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'cells.breadcrumb.files'}));
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const warningCopy =
      'The move may be incomplete. Check item locations before trying again. Move stays disabled in this view.';
    expect(screen.getByRole('alert')).toHaveTextContent(warningCopy);
    const tableRegion = screen.getByRole('table').parentElement;
    expect(tableRegion).not.toBeNull();
    expect(within(tableRegion as HTMLElement).getByText(warningCopy)).toBeInTheDocument();
    expect(within(tableRegion as HTMLElement).queryByRole('status')).not.toBeInTheDocument();
    expect(within(breadcrumbAnchor).queryByText(warningCopy)).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).not.toHaveTextContent('Moved.pdf');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Not reported.pdf');
    expect(screen.queryByText('Moved 2 items')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    expect(onRefresh).not.toHaveBeenCalled();
    breadcrumbAnchor.remove();
    window.location.hash = originalHash;
  });

  it('keeps unresolved selections locked after a failed refresh and clears them after a successful refresh', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/Drive';
    const user = userEvent.setup();
    const onRefreshAfterBulkMoveOutcome = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue({
        Status: 'Performed',
        AffectedNodes: [{Path: 'Drive/Moved.pdf', Uuid: 'moved'}],
      }),
    } as unknown as CellsRepository;
    const selectedFiles = [
      createNode({
        id: 'moved',
        name: 'Moved.pdf',
        path: 'conversation-id@example.com/Drive/Moved.pdf',
        type: CellNodeType.FILE,
      }),
      createNode({
        id: 'not-reported',
        name: 'Not reported.pdf',
        path: 'conversation-id@example.com/Drive/Not reported.pdf',
        type: CellNodeType.FILE,
      }),
    ];
    renderCellsTable({
      cellsRepository: repository,
      initialNodes: selectedFiles,
      onRefreshAfterBulkMoveOutcome,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Moved.pdf'}));
    await user.click(screen.getByRole('checkbox', {name: 'Select Not reported.pdf'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'cells.breadcrumb.files'}));
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'cells.bulkMove.refreshDrive'})).toBeEnabled();
    expect(screen.queryByRole('checkbox', {name: 'Select Moved.pdf'})).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', {name: 'Select Not reported.pdf'})).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'cells.bulkMove.refreshDrive'}));

    expect(onRefreshAfterBulkMoveOutcome).toHaveBeenCalledTimes(1);
    const tableRegion = screen.getByRole('table').parentElement;
    expect(tableRegion).not.toBeNull();
    expect(within(tableRegion as HTMLElement).getByText(/The move may be incomplete/)).toBeInTheDocument();
    expect(within(tableRegion as HTMLElement).getByRole('alert')).toHaveTextContent(
      'cells.newItemMenuModalForm.genericError',
    );
    expect(screen.getByRole('button', {name: 'cells.bulkMove.refreshDrive'})).toBeEnabled();
    expect(screen.queryByRole('checkbox', {name: 'Select Moved.pdf'})).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', {name: 'Select Not reported.pdf'})).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'cells.bulkMove.refreshDrive'}));

    expect(onRefreshAfterBulkMoveOutcome).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', {name: 'Select Moved.pdf'})).not.toBeChecked();
    expect(screen.getByRole('checkbox', {name: 'Select Not reported.pdf'})).not.toBeChecked();
    await user.click(screen.getByRole('checkbox', {name: 'Select Moved.pdf'}));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    window.location.hash = originalHash;
  });

  it.each([
    {description: 'no job evidence', backgroundActions: undefined},
    {description: 'an empty job list', backgroundActions: []},
    {
      description: 'an unrelated finished job',
      backgroundActions: [{Name: 'copy', JobUuid: 'copy-job', Status: 'Finished'}],
    },
    {description: 'a finished job without an ID', backgroundActions: [{Name: 'move', JobUuid: '', Status: 'Finished'}]},
    {description: 'a job without status', backgroundActions: [{Name: 'move', JobUuid: 'move-job'}]},
    {description: 'a running job', backgroundActions: [{Name: 'move', JobUuid: 'move-job', Status: 'Running'}]},
    {description: 'an unknown job', backgroundActions: [{Name: 'move', JobUuid: 'move-job', Status: 'Unknown'}]},
    {
      description: 'mixed finished and failed jobs',
      backgroundActions: [
        {Name: 'move', JobUuid: 'finished-job', Status: 'Finished'},
        {Name: 'move', JobUuid: 'failed-job', Status: 'Error'},
      ],
    },
  ])(
    'requires review and a successful refresh when Performed has $description but no node evidence',
    async ({backgroundActions}) => {
      const originalHash = window.location.hash;
      window.location.hash = '#/conversation/conversation-id@example.com/files/Drive';
      const user = userEvent.setup();
      const onRefresh = jest.fn();
      const onRefreshAfterBulkMoveOutcome = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const repository = {
        getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
        moveNodes: jest.fn().mockResolvedValue({Status: 'Performed', BackgroundActions: backgroundActions}),
      } as unknown as CellsRepository;
      renderCellsTable({
        cellsRepository: repository,
        initialNodes: [
          createNode({
            id: 'unknown-file',
            path: 'conversation-id@example.com/Drive/Node name',
            type: CellNodeType.FILE,
          }),
        ],
        onRefresh,
        onRefreshAfterBulkMoveOutcome,
      });

      await user.click(screen.getByRole('checkbox', {name: 'Select Node name'}));
      await user.click(screen.getByRole('button', {name: 'Move'}));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', {name: 'cells.breadcrumb.files'}));
      await user.click(within(dialog).getByRole('button', {name: 'Move'}));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The move job finished, but item locations are unknown. Refresh Drive to check before trying again.',
      );
      expect(screen.queryByText('Moved 1 items')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar', {name: 'Move completed'})).not.toBeInTheDocument();
      expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
      expect(onRefresh).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', {name: 'cells.bulkMove.refreshDrive'}));

      expect(onRefreshAfterBulkMoveOutcome).toHaveBeenCalledTimes(1);
      expect(screen.getByText('cells.newItemMenuModalForm.genericError')).toBeInTheDocument();
      expect(screen.queryByRole('checkbox', {name: 'Select Node name'})).not.toBeInTheDocument();
      expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', {name: 'cells.bulkMove.refreshDrive'}));

      expect(onRefreshAfterBulkMoveOutcome).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', {name: 'Select Node name'})).not.toBeChecked();
      expect(repository.moveNodes).toHaveBeenCalledTimes(1);
      expect(onRefresh).not.toHaveBeenCalled();
      window.location.hash = originalHash;
    },
  );

  it.each([
    {
      description: 'a polled background job',
      response: {Status: 'Background', BackgroundActions: [{JobUuid: 'move-job', Name: 'move'}]},
      statusChecks: 1,
    },
    {
      description: 'an awaited job',
      response: {Status: 'Performed', BackgroundActions: [{JobUuid: 'move-job', Name: 'move', Status: 'Finished'}]},
      statusChecks: 0,
    },
    {
      description: 'multiple awaited jobs',
      response: {
        Status: 'Performed',
        BackgroundActions: [
          {JobUuid: 'move-job-1', Name: 'move', Status: 'Finished'},
          {JobUuid: 'move-job-2', Name: 'move', Status: 'Finished'},
        ],
      },
      statusChecks: 0,
    },
  ])('completes and refreshes with $description and no item outcomes', async ({response, statusChecks}) => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/Drive';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue(response),
      getBackgroundMoveInfo: jest.fn().mockResolvedValue({Status: 'Finished', JobUuid: 'move-job', Name: 'move'}),
    } as unknown as CellsRepository;
    const table = renderCellsTable({
      cellsRepository: repository,
      initialNodes: [
        createNode({id: 'unknown-file', path: 'conversation-id@example.com/Drive/Node name', type: CellNodeType.FILE}),
      ],
      onRefresh,
    });
    onRefresh.mockImplementation(() => {
      table.rerenderWithNodes([]);
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Node name'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'cells.breadcrumb.files'}));
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Moved 1 items')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', {name: 'Move completed'})).toHaveAttribute('aria-valuenow', '100');
    expect(screen.queryByRole('button', {name: 'cells.bulkMove.refreshDrive'})).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', {name: 'Select Node name'})).not.toBeInTheDocument();
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(statusChecks);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    window.location.hash = originalHash;
  });

  it('keeps the folder form open with an error when creation fails', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files';
    const user = userEvent.setup();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      createFolder: jest.fn().mockRejectedValue(new Error('folder creation failed')),
      moveNodes: jest.fn(),
    } as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository, initialNodes: [createNode({type: CellNodeType.FILE})]});

    await user.click(screen.getByRole('checkbox', {name: 'Select Node name'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));
    await user.type(within(dialog).getByLabelText('cells.newItemMenuModal.labelFolder'), 'Reports');
    await user.click(within(dialog).getByRole('button', {name: 'cells.newItemMenuModal.primaryAction'}));

    expect(await within(dialog).findByText('cells.newItemMenuModalForm.genericError')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('cells.newItemMenuModal.labelFolder')).toHaveValue('Reports');
    expect(repository.moveNodes).not.toHaveBeenCalled();
    window.location.hash = originalHash;
  });

  it('returns to the destination picker when folder creation is canceled', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files';
    const user = userEvent.setup();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      createFolder: jest.fn(),
      moveNodes: jest.fn(),
    } as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository, initialNodes: [createNode({type: CellNodeType.FILE})]});

    await user.click(screen.getByRole('checkbox', {name: 'Select Node name'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));
    await user.click(within(dialog).getByRole('button', {name: 'cells.newItemMenuModal.secondaryAction'}));

    expect(within(dialog).getByRole('heading', {name: 'Move to folder'})).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}),
    ).toBeInTheDocument();
    expect(repository.createFolder).not.toHaveBeenCalled();
    window.location.hash = originalHash;
  });

  it('moves to the drive root from a nested route, refreshes after Performed, and closes the preview', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web/Marketing images';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue({
        Status: 'Performed',
        AffectedNodes: [
          {Uuid: 'folder-id', Path: 'conversation-id@example.com/Images'},
          {Uuid: 'file-id', Path: 'conversation-id@example.com/Wire logs.pdf'},
        ],
      }),
    } as unknown as CellsRepository;
    renderCellsTable({
      cellsRepository: repository,
      initialNodes: [
        createNode({id: 'folder-id', name: 'Marketing images', path: 'wire-cells-web/Marketing images/Images'}),
        createNode({
          id: 'file-id',
          name: 'Wire logs.pdf',
          path: 'wire-cells-web/Marketing images/Wire logs.pdf',
          type: CellNodeType.FILE,
          extension: 'pdf',
        }),
      ],
      onRefresh,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('checkbox', {name: 'Select Wire logs.pdf'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'cells.breadcrumb.files'}));
    const submitButton = within(dialog).getByRole('button', {name: 'Move'});
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    });
    expect(repository.moveNodes).toHaveBeenCalledWith({
      currentPaths: ['wire-cells-web/Marketing images/Images', 'wire-cells-web/Marketing images/Wire logs.pdf'],
      targetPath: 'conversation-id@example.com',
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    window.location.hash = originalHash;
  });

  it('keeps background progress visible and prevents another move across navigation and action toggles', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const backgroundResponse = {Status: 'Background', BackgroundActions: [{JobUuid: 'move-job', Name: 'move'}]};
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue(backgroundResponse),
      getBackgroundMoveInfo: jest.fn().mockResolvedValue({Status: 'Running'}),
    } as unknown as CellsRepository;
    const {rerenderWithSelectionScope} = renderCellsTable({
      cellsRepository: repository,
      folderPath: 'wire-cells-web/Marketing images',
      onRefresh,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'cells.breadcrumb.files'}));
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));

    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText('Move to folder')).not.toBeInTheDocument();
    expect(screen.getByText('Moving 1 items')).toBeInTheDocument();
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    expect(onRefresh).not.toHaveBeenCalled();

    rerenderWithSelectionScope('conversation:/subfolder');
    rerenderWithSelectionScope('conversation:/files');
    rerenderWithSelectionScope('conversation:/files', false);
    rerenderWithSelectionScope('conversation:/files', true);
    expect(screen.queryByText('Move to folder')).not.toBeInTheDocument();
    expect(screen.getByText('Moving 1 items')).toBeInTheDocument();
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    expect(onRefresh).not.toHaveBeenCalled();
    window.location.hash = originalHash;
  });

  it('moves a selected file to the folder shown by the active breadcrumb', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web/folder';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue({
        Status: 'Performed',
        AffectedNodes: [{Uuid: 'nested-file', Path: 'conversation-id@example.com/wire-cells-web/folder/aaaa-1.docx'}],
      }),
    } as unknown as CellsRepository;
    renderCellsTable({
      cellsRepository: repository,
      initialNodes: [
        createNode({
          id: 'nested-file',
          name: 'aaaa-1.docx',
          path: 'wire-cells-web/other-folder/aaaa-1.docx',
          type: CellNodeType.FILE,
          extension: 'docx',
        }),
      ],
      onRefresh,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select aaaa-1.docx'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const preview = await screen.findByRole('dialog');
    const breadcrumbs = within(preview).getAllByRole('list')[0];
    expect(within(breadcrumbs).getByText('folder')).toBeInTheDocument();
    expect(within(preview).getByRole('button', {name: 'Move'})).toBeEnabled();
    await user.click(within(preview).getByRole('button', {name: 'Move'}));

    await waitFor(() => {
      expect(repository.moveNodes).toHaveBeenCalledWith({
        currentPaths: ['wire-cells-web/other-folder/aaaa-1.docx'],
        targetPath: 'conversation-id@example.com/wire-cells-web/folder',
      });
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    window.location.hash = originalHash;
  });

  it('allows moving a file to its immediate parent but blocks its current parent', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web/A/B';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const repository = {
      getAllNodes: jest
        .fn()
        .mockResolvedValueOnce({Nodes: []})
        .mockResolvedValueOnce({
          Nodes: [{Type: 'COLLECTION', Uuid: 'folder-b', Path: 'wire-cells-web/A/B'}],
        }),
      moveNodes: jest.fn().mockResolvedValue({
        Status: 'Performed',
        AffectedNodes: [{Uuid: 'report-file', Path: 'conversation-id@example.com/wire-cells-web/A/Report.pdf'}],
      }),
    } as unknown as CellsRepository;
    renderCellsTable({
      cellsRepository: repository,
      initialNodes: [
        createNode({
          id: 'report-file',
          name: 'Report.pdf',
          path: 'wire-cells-web/A/B/Report.pdf',
          type: CellNodeType.FILE,
          extension: 'pdf',
        }),
      ],
      onRefresh,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Report.pdf'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const preview = await screen.findByRole('dialog');
    expect(within(preview).getByRole('button', {name: 'Move'})).toBeDisabled();
    await user.click(within(preview).getByRole('button', {name: 'A'}));

    const breadcrumbs = within(preview).getAllByRole('list')[0];
    expect(within(breadcrumbs).getByText('A')).toBeInTheDocument();
    expect(await within(preview).findByRole('button', {name: 'B Current location'})).toBeDisabled();
    expect(within(preview).getByRole('button', {name: 'Move'})).toBeEnabled();

    await user.click(within(preview).getByRole('button', {name: 'Move'}));
    await waitFor(() => {
      expect(repository.moveNodes).toHaveBeenCalledWith({
        currentPaths: ['wire-cells-web/A/B/Report.pdf'],
        targetPath: 'conversation-id@example.com/wire-cells-web/A',
      });
    });
    window.location.hash = originalHash;
  });

  it('refreshes and completes only after every background job finishes', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web/Marketing images';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const backgroundResponse = {
      Status: 'Background',
      AffectedNodes: [{Path: 'wire-cells-web/Marketing images', Uuid: 'folder-id'}],
      BackgroundActions: [
        {JobUuid: 'move-job-1', Name: 'move'},
        {JobUuid: 'move-job-2', Name: 'move'},
      ],
    };
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue(backgroundResponse),
      getBackgroundMoveInfo: jest
        .fn()
        .mockResolvedValueOnce({Status: 'Finished'})
        .mockResolvedValueOnce({Status: 'Running'})
        .mockResolvedValueOnce({Status: 'Finished'})
        .mockResolvedValueOnce({Status: 'Finished'}),
    } as unknown as CellsRepository;
    renderCellsTable({
      cellsRepository: repository,
      folderPath: 'wire-cells-web/Marketing images/Reports',
      onRefresh,
      clock,
    });
    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'cells.breadcrumb.files'}));
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));

    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(2);
    });
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.queryByText('Move to folder')).not.toBeInTheDocument();
    expect(screen.getByText('Moving 1 items')).toBeInTheDocument();
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);

    await act(async () => {
      clock.advanceByMilliseconds(1000);
      await waitFor(() => {
        expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(4);
      });
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Moved 1 items')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', {name: 'Move completed'})).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('button', {name: 'Move'})).toBeEnabled();
    expect(screen.queryByRole('button', {name: 'cells.bulkMove.refreshDrive'})).not.toBeInTheDocument();
    expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(4);

    await act(async () => {
      clock.advanceByMilliseconds(1000);
      await Promise.resolve();
    });

    expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(4);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    window.location.hash = originalHash;
  });

  it('warns when one background job finishes while another fails', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue({
        Status: 'Background',
        BackgroundActions: [
          {JobUuid: 'finished-job', Name: 'move'},
          {JobUuid: 'failed-job', Name: 'move'},
        ],
      }),
      getBackgroundMoveInfo: jest
        .fn()
        .mockResolvedValueOnce({Status: 'Finished'})
        .mockResolvedValueOnce({Status: 'Error'}),
    } as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository, folderPath: 'wire-cells-web/Marketing images', onRefresh});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'cells.breadcrumb.files'}));
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The move may be incomplete. Check item locations before trying again. Move stays disabled in this view.',
    );
    expect(
      screen.getAllByRole('alert').map(alert => {
        return alert.textContent;
      }),
    ).toContain(
      'The move may be incomplete. Check item locations before trying again. Move stays disabled in this view.',
    );
    expect(screen.queryByText('Moved 1 items')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar', {name: 'Move completed'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
    expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(2);
    expect(onRefresh).not.toHaveBeenCalled();
    window.location.hash = originalHash;
  });

  it.each([true, false])(
    'requires a user refresh after a status lookup failure followed by terminal error (refresh succeeds: %s)',
    async refreshSucceeded => {
      const originalHash = window.location.hash;
      window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
      const user = userEvent.setup();
      const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
      const onRefresh = jest.fn();
      const onRefreshAfterBulkMoveOutcome = jest.fn().mockResolvedValue(refreshSucceeded);
      const repository = {
        getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
        moveNodes: jest
          .fn()
          .mockResolvedValueOnce({Status: 'Background', BackgroundActions: [{JobUuid: 'move-job', Name: 'move'}]})
          .mockResolvedValueOnce({Status: 'Performed'}),
        getBackgroundMoveInfo: jest
          .fn()
          .mockRejectedValueOnce(new Error('Status unavailable'))
          .mockResolvedValueOnce({Status: 'Error'}),
      } as unknown as CellsRepository;
      renderCellsTable({cellsRepository: repository, onRefresh, onRefreshAfterBulkMoveOutcome, clock});

      await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
      await user.click(screen.getByRole('button', {name: 'Move'}));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', {name: 'Move'}));
      await waitFor(() => {
        expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(1);
      });
      expect(onRefresh).not.toHaveBeenCalled();

      await act(async () => {
        clock.advanceByMilliseconds(1000);
        await Promise.resolve();
      });
      await waitFor(() => {
        expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(2);
      });
      expect(onRefresh).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The move jobs failed or were interrupted. Refresh Drive to check item locations before trying again.',
      );
      expect(
        screen.getAllByRole('alert').map(alert => {
          return alert.textContent;
        }),
      ).toContain(
        'The move jobs failed or were interrupted. Refresh Drive to check item locations before trying again.',
      );
      expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', {name: 'cells.bulkMove.refreshDrive'}));
      await waitFor(() => {
        expect(onRefreshAfterBulkMoveOutcome).toHaveBeenCalledTimes(1);
      });
      expect(onRefresh).not.toHaveBeenCalled();
      expect(repository.moveNodes).toHaveBeenCalledTimes(1);
      if (refreshSucceeded) {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('checkbox', {name: 'Select Marketing images'})).not.toBeChecked();
      } else {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        const tableRegion = screen.getByRole('table').parentElement;
        expect(tableRegion).not.toBeNull();
        expect(
          within(tableRegion as HTMLElement).getByText(
            'The move jobs failed or were interrupted. Refresh Drive to check item locations before trying again.',
          ),
        ).toBeInTheDocument();
        expect(within(tableRegion as HTMLElement).getByRole('alert')).toHaveTextContent(
          'cells.newItemMenuModalForm.genericError',
        );
      }
      window.location.hash = originalHash;
    },
  );

  it('jitters unknown-status retries within bounded, increasing exponential intervals', async () => {
    const user = userEvent.setup();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const randomSamples = [0, 1 - Number.EPSILON];
    let randomSampleIndex = 0;
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest
        .fn()
        .mockResolvedValue({Status: 'Background', BackgroundActions: [{JobUuid: 'move-job', Name: 'move'}]}),
      getBackgroundMoveInfo: jest
        .fn()
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Unknown'}),
    } as unknown as CellsRepository;
    const random = (): number => {
      return randomSamples[randomSampleIndex++] ?? 0.5;
    };
    renderCellsTable({cellsRepository: repository, clock, random});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));
    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      clock.advanceByMilliseconds(749);
      await Promise.resolve();
    });
    expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(1);
    await act(async () => {
      clock.advanceByMilliseconds(1);
      await waitFor(() => {
        expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(2);
      });
    });

    await act(async () => {
      clock.advanceByMilliseconds(2499);
      await Promise.resolve();
    });
    expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(2);
    await act(async () => {
      clock.advanceByMilliseconds(1);
      await waitFor(() => {
        expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(3);
      });
    });
  });

  it('keeps normal polling steady and resets the retry backoff after a known status', async () => {
    const user = userEvent.setup();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const random = jest.fn(() => {
      return 0.5;
    });
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest
        .fn()
        .mockResolvedValue({Status: 'Background', BackgroundActions: [{JobUuid: 'move-job', Name: 'move'}]}),
      getBackgroundMoveInfo: jest
        .fn()
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Running'})
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Finished'}),
    } as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository, clock, random});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));
    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(1);
    });
    expect(random).toHaveBeenCalledTimes(1);

    await act(async () => {
      clock.advanceByMilliseconds(1000);
      await waitFor(() => {
        expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(2);
      });
    });
    expect(random).toHaveBeenCalledTimes(1);

    await act(async () => {
      clock.advanceByMilliseconds(1000);
      await waitFor(() => {
        expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(3);
      });
    });
    expect(random).toHaveBeenCalledTimes(2);

    await act(async () => {
      clock.advanceByMilliseconds(999);
      await Promise.resolve();
    });
    expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(3);
    await act(async () => {
      clock.advanceByMilliseconds(1);
      await waitFor(() => {
        expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(4);
      });
    });
  });

  it('keeps retry blocked after a mixed terminal result despite loading or refreshed rows', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
    const user = userEvent.setup();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const movedFile = createNode({
      id: 'moved-file',
      name: 'Moved.pdf',
      path: 'wire-cells-web/Moved.pdf',
      type: CellNodeType.FILE,
    });
    const failedFile = createNode({
      id: 'failed-file',
      name: 'Failed.pdf',
      path: 'wire-cells-web/Failed.pdf',
      type: CellNodeType.FILE,
    });
    const onRefresh = jest.fn();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest
        .fn()
        .mockResolvedValueOnce({
          Status: 'Background',
          BackgroundActions: [
            {JobUuid: 'moved-job', Name: 'move'},
            {JobUuid: 'failed-job', Name: 'move'},
          ],
        })
        .mockResolvedValueOnce({Status: 'Performed'}),
      getBackgroundMoveInfo: jest
        .fn()
        .mockResolvedValueOnce({Status: 'Finished'})
        .mockResolvedValueOnce({Status: 'Error'}),
    } as unknown as CellsRepository;
    const table = renderCellsTable({
      cellsRepository: repository,
      initialNodes: [movedFile, failedFile],
      onRefresh,
      clock,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Moved.pdf'}));
    await user.click(screen.getByRole('checkbox', {name: 'Select Failed.pdf'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'cells.breadcrumb.files'}));
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));

    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(2);
    });
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The move may be incomplete. Check item locations before trying again. Move stays disabled in this view.',
    );
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();

    table.rerenderWithNodes([movedFile, failedFile]);
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
    table.rerenderWithNodes([]);
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
    table.rerenderWithNodes([movedFile, failedFile]);
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
    table.rerenderWithNodes([failedFile]);
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    window.location.hash = originalHash;
  });

  it('bounds status lookup retries and offers a safe status check recovery', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
    const user = userEvent.setup();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const onRefresh = jest.fn();
    const random = jest.fn(() => {
      return 0.5;
    });
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue({
        Status: 'Background',
        AffectedNodes: [{Path: 'conversation-id@example.com/Marketing images', Uuid: 'folder-id'}],
        BackgroundActions: [{JobUuid: 'move-job', Name: 'move'}],
      }),
      getBackgroundMoveInfo: jest
        .fn()
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Finished'}),
    } as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository, onRefresh, clock, random});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));

    for (const [attempt, delay] of [1000, 2000, 4000, 8000, 16000].entries()) {
      await waitFor(() => {
        expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(attempt + 1);
      });
      await act(async () => {
        clock.advanceByMilliseconds(delay);
        await Promise.resolve();
      });
    }
    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(6);
    });
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    expect(random).toHaveBeenCalledTimes(5);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The move status could not be checked. Refresh Drive to check item locations before trying again.',
    );
    expect(
      screen.getAllByRole('alert').map(alert => {
        return alert.textContent;
      }),
    ).toContain('The move status could not be checked. Refresh Drive to check item locations before trying again.');
    await user.click(screen.getByRole('button', {name: 'cells.bulkMove.checkStatus'}));
    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(7);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Moved 1 items')).toBeInTheDocument();
    window.location.hash = originalHash;
  });

  it('closes the destination dialog while tracking a background move', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
    const user = userEvent.setup();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const onRefresh = jest.fn();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest
        .fn()
        .mockResolvedValue({Status: 'Background', BackgroundActions: [{JobUuid: 'move-job', Name: 'move'}]}),
      getBackgroundMoveInfo: jest
        .fn()
        .mockResolvedValueOnce({Status: 'Running'})
        .mockResolvedValueOnce({Status: 'Finished'}),
    } as unknown as CellsRepository;
    const {rerenderWithSelectionScope} = renderCellsTable({cellsRepository: repository, onRefresh, clock});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));
    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText('Move to folder')).not.toBeInTheDocument();
    expect(screen.getByText('Moving 1 items')).toBeInTheDocument();

    rerenderWithSelectionScope('conversation:/files/subfolder');
    rerenderWithSelectionScope('conversation:/files');
    rerenderWithSelectionScope('conversation:/files', false);
    rerenderWithSelectionScope('conversation:/files', true);
    expect(screen.queryByText('Move to folder')).not.toBeInTheDocument();
    expect(screen.getByText('Moving 1 items')).toBeInTheDocument();
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);

    await act(async () => {
      clock.advanceByMilliseconds(1000);
      await waitFor(() => {
        expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(2);
      });
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Moved 1 items')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    window.location.hash = originalHash;
  });

  it.each([
    ['missing status', {}],
    ['missing job identifiers', {Status: 'Background'}],
  ])('keeps recovery guidance open for a malformed Background response with %s', async (_scenario, response) => {
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue(response),
      getBackgroundMoveInfo: jest.fn(),
    } as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository, onRefresh});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));

    await waitFor(() => {
      expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The move status could not be checked. Refresh Drive to check item locations before trying again.',
    );
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
    expect(repository.getBackgroundMoveInfo).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', {name: 'cells.bulkMove.refreshDrive'}));
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', {name: 'Select Marketing images'})).toBeInTheDocument();
  });

  it('ignores an in-flight status response after the table unmounts', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    let resolveStatus: (response: {Status: string}) => void = noop;
    const pendingStatus = new Promise<{Status: string}>(resolve => {
      resolveStatus = resolve;
    });
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest
        .fn()
        .mockResolvedValue({Status: 'Background', BackgroundActions: [{JobUuid: 'move-job', Name: 'move'}]}),
      getBackgroundMoveInfo: jest.fn().mockReturnValue(pendingStatus),
    } as unknown as CellsRepository;
    const {unmount} = renderCellsTable({cellsRepository: repository, onRefresh});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));
    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(1);
    });

    unmount();
    await act(async () => {
      resolveStatus({Status: 'Finished'});
      await pendingStatus;
    });
    expect(onRefresh).not.toHaveBeenCalled();
    window.location.hash = originalHash;
  });

  it('clears background status timers when the table unmounts', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
    const user = userEvent.setup();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest
        .fn()
        .mockResolvedValue({Status: 'Background', BackgroundActions: [{JobUuid: 'move-job', Name: 'move'}]}),
      getBackgroundMoveInfo: jest.fn().mockResolvedValue({Status: 'Running'}),
    } as unknown as CellsRepository;
    const {unmount} = renderCellsTable({cellsRepository: repository, clock});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));
    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(1);
    });

    unmount();
    await act(async () => {
      clock.advanceByMilliseconds(1000);
      await Promise.resolve();
    });
    expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(1);
    window.location.hash = originalHash;
  });

  it('prevents duplicate submissions while a move request is pending', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
    const user = userEvent.setup();
    let resolveMove: (response: object) => void = noop;
    const pendingMove = new Promise<object>(resolve => {
      resolveMove = resolve;
    });
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockReturnValue(pendingMove),
    } as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository, folderPath: 'wire-cells-web/Marketing images'});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('checkbox', {name: 'Select Wire logs.pdf'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    const submitButton = within(dialog).getByRole('button', {name: 'Move'});
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    await user.click(submitButton);
    await waitFor(() => {
      expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText('Move to folder')).not.toBeInTheDocument();
    expect(screen.getByText('Moving 2 items')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', {name: 'Processing'})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveMove({
        Status: 'Performed',
        AffectedNodes: [
          {Uuid: 'folder-id', Path: 'conversation-id@example.com/wire-cells-web/Marketing images'},
          {Uuid: 'file-id', Path: 'conversation-id@example.com/wire-cells-web/Wire logs.pdf'},
        ],
      });
    });
    await waitFor(() => {
      expect(screen.getByText('Moved 2 items')).toBeInTheDocument();
    });
    expect(screen.getByRole('progressbar', {name: 'Move completed'})).toHaveAttribute('aria-valuenow', '100');
    window.location.hash = originalHash;
  });

  it('keeps a dismissed provisional popup hidden after the request starts background polling', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
    const user = userEvent.setup();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    let resolveMove: (response: object) => void = noop;
    const pendingMove = new Promise<object>(resolve => {
      resolveMove = resolve;
    });
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockReturnValue(pendingMove),
      getBackgroundMoveInfo: jest.fn().mockResolvedValue({Status: 'Running'}),
    } as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository, clock, folderPath: 'wire-cells-web/Marketing images'});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'cells.breadcrumb.files'}));
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));
    await waitFor(() => {
      expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText('Move to folder')).not.toBeInTheDocument();
    expect(screen.getByText('Moving 1 items')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'fileCardDefaultCloseButtonLabel'}));
    expect(screen.queryByText('Moving 1 items')).not.toBeInTheDocument();
    await act(async () => {
      resolveMove({Status: 'Background', BackgroundActions: [{JobUuid: 'move-job', Name: 'move'}]});
    });
    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText('Moving 1 items')).not.toBeInTheDocument();

    await act(async () => {
      clock.advanceByMilliseconds(1000);
      await waitFor(() => {
        expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(2);
      });
    });
    expect(screen.queryByText('Moving 1 items')).not.toBeInTheDocument();
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    window.location.hash = originalHash;
  });

  it('disables submission for a folder and its selected child without sending a request', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/Drive';
    const user = userEvent.setup();
    const folder = createNode({id: 'folder', name: 'Folder', path: 'Drive/Folder', type: CellNodeType.FOLDER});
    const child = createNode({
      id: 'child',
      name: 'Child file',
      path: 'Drive/Folder/child.txt',
      type: CellNodeType.FILE,
      extension: 'txt',
    });
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn(),
    } as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository, initialNodes: [folder, child]});

    await user.click(screen.getByRole('checkbox', {name: 'Select Folder'}));
    await user.click(screen.getByRole('checkbox', {name: 'Select Child file'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', {name: 'Move'})).toBeDisabled();
    expect(repository.moveNodes).not.toHaveBeenCalled();
    window.location.hash = originalHash;
  });

  it('hides bulk Move when any selected node is not movable', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/Drive';
    try {
      const user = userEvent.setup();
      const folder = createNode({id: 'folder', name: 'Folder', path: 'Drive/Folder'});
      const viewerFile = createNode({
        id: 'viewer-file',
        name: 'Viewer file',
        path: 'Drive/viewer.txt',
        type: CellNodeType.FILE,
        selfUserDriveRole: 'viewer',
      });
      const repository = {
        getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
        moveNodes: jest.fn(),
      } as unknown as CellsRepository;
      renderCellsTable({cellsRepository: repository, initialNodes: [folder, viewerFile]});

      await user.click(screen.getByRole('checkbox', {name: 'Select Folder'}));
      await user.click(screen.getByRole('checkbox', {name: 'Select Viewer file'}));

      expect(screen.getByText('2 selected')).toBeInTheDocument();
      expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
      expect(repository.moveNodes).not.toHaveBeenCalled();
    } finally {
      window.location.hash = originalHash;
    }
  });

  it.each([THEME_ID.LIGHT, THEME_ID.DARK])(
    'keeps one failure announcement and recovery available in %s',
    async themeId => {
      const originalHash = window.location.hash;
      window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
      const user = userEvent.setup();
      const onRefresh = jest.fn();
      let rejectMove: (reason: unknown) => void = noop;
      const pendingMove = new Promise<object>((_, reject) => {
        rejectMove = reject;
      });
      const repository = {
        getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
        moveNodes: jest.fn().mockReturnValue(pendingMove),
      } as unknown as CellsRepository;
      renderCellsTable({
        cellsRepository: repository,
        folderPath: 'wire-cells-web/Marketing images',
        onRefresh,
        themeId,
      });

      await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
      await user.click(screen.getByRole('checkbox', {name: 'Select Wire logs.pdf'}));
      await user.click(screen.getByRole('button', {name: 'Move'}));

      const dialog = await screen.findByRole('dialog');
      const submitButton = within(dialog).getByRole('button', {name: 'Move'});
      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(repository.moveNodes).toHaveBeenCalledTimes(1);
      });
      expect(screen.queryByText('Move to folder')).not.toBeInTheDocument();
      expect(screen.getByText('Moving 2 items')).toBeInTheDocument();
      await act(async () => {
        rejectMove(new Error('Move failed'));
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Moving 2 items')).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The move request failed. Some items may have moved. Refresh Drive to check item locations before trying again.',
      );
      const tableRegion = screen.getByRole('table').parentElement;
      expect(tableRegion).not.toBeNull();
      expect(
        within(tableRegion as HTMLElement).getByText(
          'The move request failed. Some items may have moved. Refresh Drive to check item locations before trying again.',
        ),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(within(tableRegion as HTMLElement).queryByRole('status')).not.toBeInTheDocument();
      expect(onRefresh).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', {name: 'fileCardDefaultCloseButtonLabel'}));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      const bannerRegion = screen.getByRole('table').parentElement;
      expect(bannerRegion).not.toBeNull();
      expect(
        within(bannerRegion as HTMLElement).getByText(
          'The move request failed. Some items may have moved. Refresh Drive to check item locations before trying again.',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', {name: 'cells.bulkMove.refreshDrive'}));
      expect(
        screen.queryByText(
          'The move request failed. Some items may have moved. Refresh Drive to check item locations before trying again.',
        ),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', {name: 'Select Marketing images'})).not.toBeChecked();
      expect(repository.moveNodes).toHaveBeenCalledTimes(1);
      window.location.hash = originalHash;
    },
  );
});

describe('CellsTable selection keyboard access', () => {
  it('toggles a named checkbox with the keyboard', async () => {
    const user = userEvent.setup();
    renderCellsTable();
    const checkbox = screen.getByRole('checkbox', {name: 'Select Marketing images'});

    checkbox.focus();
    await user.keyboard(' ');

    expect(checkbox).toBeChecked();
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    const checkboxAfterSelection = screen.getByRole('checkbox', {name: 'Select Marketing images'});
    checkboxAfterSelection.focus();
    await user.keyboard(' ');

    expect(screen.getByRole('checkbox', {name: 'Select Marketing images'})).not.toBeChecked();
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  });
});

describe('CellsTable selection interactions', () => {
  it('preserves selection when opening a file from row options', async () => {
    const user = userEvent.setup();
    renderCellsTable();
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', {name: 'cells.options.label'})[1]);
    await user.click(screen.getByRole('menuitem', {name: 'cells.options.open'}));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(checkbox).toBeChecked();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });
});

describe('CellsTable selection scope', () => {
  it('clears selected nodes when the folder/view scope changes', () => {
    const {rerenderWithSelectionScope} = renderCellsTable();
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    rerenderWithSelectionScope('conversation:/files/subfolder');

    expect(screen.queryByRole('button', {name: 'cells.selection.clear'})).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked();

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    rerenderWithSelectionScope('conversation:/bin');

    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked();
  });

  it('removes selected items and count when a refresh removes nodes', () => {
    const {file, rerenderWithNodes} = renderCellsTable();
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    rerenderWithNodes([file]);

    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('hides selection controls when selection is out of scope', () => {
    renderCellsTable({selectionEnabled: false});

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

describe('CellsTable folder row drop target', () => {
  it('highlights a folder row and drops files into that folder path', async () => {
    const droppedFile = new File(['content'], 'document.pdf', {type: 'application/pdf'});
    const dataTransfer = createDataTransfer([droppedFile]);
    const {onDropFilesToFolder, onFolderDropTargetChange} = renderCellsTable();
    const folderRow = screen.getByRole('row', {name: /Marketing images/});

    fireEvent.dragEnter(folderRow, {dataTransfer});

    expect(folderRow).toHaveAttribute('data-folder-drop-active', 'true');
    expect(onFolderDropTargetChange).toHaveBeenLastCalledWith('Marketing images');
    expect(screen.getByRole('status')).toHaveTextContent('sharedDriveDropOverlayTitle');
    expect(screen.getByRole('status')).toHaveTextContent('Marketing images');
    expect(screen.getByRole('status').querySelector('[title="Marketing images"]')).toBeInTheDocument();

    fireEvent.drop(folderRow, {dataTransfer});

    await waitFor(() => {
      return expect(onDropFilesToFolder).toHaveBeenCalledWith(
        [droppedFile],
        'conversation-id@example.com/Marketing/images',
      );
    });
    expect(onFolderDropTargetChange).toHaveBeenLastCalledWith(null);
  });

  it('preserves folder row paths exactly', async () => {
    const droppedFile = new File(['content'], 'document.pdf', {type: 'application/pdf'});
    const dataTransfer = createDataTransfer([droppedFile]);
    const {onDropFilesToFolder} = renderCellsTable({folderPath: 'direct-upload'});
    const folderRow = screen.getByRole('row', {name: /Marketing images/});

    fireEvent.drop(folderRow, {dataTransfer});

    await waitFor(() => {
      return expect(onDropFilesToFolder).toHaveBeenCalledWith([droppedFile], 'direct-upload');
    });
  });

  it('reports folder discovery failure without uploading partial files to the folder row', async () => {
    const {onDropFilesToFolder, onDropReadError} = renderCellsTable();
    const folderRow = screen.getByRole('row', {name: /Marketing images/});
    const failedDirectory = {
      isDirectory: true,
      isFile: false,
      name: 'Reports',
      fullPath: '/Reports',
      createReader: () => {
        return {
          readEntries: (_success: unknown, failure: (error: DOMException) => void) => {
            return failure(new DOMException('Directory unavailable', 'NotFoundError'));
          },
        };
      },
    };
    const dataTransfer = {
      dropEffect: 'none',
      files: [],
      items: [
        {
          webkitGetAsEntry: () => {
            return failedDirectory;
          },
        },
      ],
      types: ['Files'],
    };

    fireEvent.drop(folderRow, {dataTransfer});

    await waitFor(() => {
      return expect(onDropReadError).toHaveBeenCalledTimes(1);
    });
    expect(onDropFilesToFolder).not.toHaveBeenCalled();
  });

  it('does not make file rows folder drop targets', () => {
    const droppedFile = new File(['content'], 'document.pdf', {type: 'application/pdf'});
    const dataTransfer = createDataTransfer([droppedFile]);
    const {onDropFilesToFolder, onFolderDropTargetChange} = renderCellsTable();
    const fileRow = screen.getByRole('row', {name: /Wire logs\.pdf/});

    fireEvent.dragEnter(fileRow, {dataTransfer});
    fireEvent.drop(fileRow, {dataTransfer});

    expect(fileRow).not.toHaveAttribute('data-folder-drop-active');
    expect(onDropFilesToFolder).not.toHaveBeenCalled();
    expect(onFolderDropTargetChange).not.toHaveBeenCalled();
  });

  it('clears the folder drop target when the shared drop state is reset', () => {
    const droppedFile = new File(['content'], 'document.pdf', {type: 'application/pdf'});
    const dataTransfer = createDataTransfer([droppedFile]);
    const {rerenderWithResetKey} = renderCellsTable({folderDropResetKey: 0});
    const folderRow = screen.getByRole('row', {name: /Marketing images/});

    fireEvent.dragEnter(folderRow, {dataTransfer});

    expect(folderRow).toHaveAttribute('data-folder-drop-active', 'true');

    rerenderWithResetKey(1);

    expect(folderRow).not.toHaveAttribute('data-folder-drop-active');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
