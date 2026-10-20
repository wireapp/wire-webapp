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
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import userEvent from '@testing-library/user-event';
import {noop} from 'noop-esm';

import {ThemeProvider} from '@wireapp/react-ui-kit';
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

import {CellsTable} from './cellsTable';

import {CELLS_SELF_USER_DRIVE_ROLE} from '../common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';

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
  if (key === 'cells.bulkMove.previewTitle') {
    return `Preview move of ${substitutions?.count} items`;
  }
  if (key === 'cells.bulkMove.previewDescription') {
    return 'Choose a destination in this conversation’s Drive, then move the selected items.';
  }
  if (key === 'cells.bulkMove.moveButton') {
    return 'Move';
  }
  if (key === 'cells.bulkMove.movingButton') {
    return 'Moving';
  }
  if (key === 'cells.bulkMove.selectedItems') {
    return 'Selected items';
  }
  if (key === 'cells.bulkMove.currentDestination') {
    return `Current destination: ${substitutions?.destination}`;
  }
  if (key === 'cells.bulkMove.drive') {
    return 'Drive';
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

const createNode = (overrides: Partial<CellNode>): CellNode => {
  return {
    id: 'node-id',
    path: 'node-name',
    name: 'Node name',
    sizeMb: '1 MB',
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
  onRefresh = jest.fn(),
  clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
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
  readonly clock?: ReturnType<typeof createDeterministicClock>;
} = {}) => {
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
  ) => {
    return (
      <ThemeProvider>
        <CellsTable
          nodes={nodes}
          cellsRepository={cellsRepository}
          conversation={{} as Conversation}
          conversationQualifiedId={conversationQualifiedId}
          conversationName="Conversation"
          onRefresh={onRefresh}
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
          selectionBarAnchor={document.body}
        />
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
  it('selects files and folders and clears the selection', () => {
    renderCellsTable();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
    expect(checkboxes[0]).toHaveAccessibleName('Select Marketing images');

    fireEvent.click(checkboxes[0]);
    expect(screen.getByRole('button', {name: 'Move'})).toBeInTheDocument();
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

  it('keeps selection available while browsing the recycle bin', () => {
    renderCellsTable({selectionScopeKey: 'conversation:/bin'});

    fireEvent.click(screen.getAllByRole('checkbox')[0]);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('hides selection controls when the Drive bulk actions feature flag is off', () => {
    renderCellsTable({isBulkActionsEnabled: false});

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Clear selection'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Move'})).not.toBeInTheDocument();
  });

  it('previews every selected item and browses destinations without moving or clearing selection', async () => {
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
    expect(within(preview).getByText('Preview move of 2 items')).toBeInTheDocument();
    expect(
      within(preview).getByText('Choose a destination in this conversation’s Drive, then move the selected items.'),
    ).toBeInTheDocument();
    const selectedItems = within(preview).getByRole('region', {name: 'Selected items'});
    expect(within(selectedItems).getByRole('heading', {name: 'Selected items'})).toBeInTheDocument();
    expect(within(selectedItems).getByText('Marketing images')).toBeInTheDocument();
    expect(within(selectedItems).getByText('Wire logs.pdf')).toBeInTheDocument();
    expect(within(preview).getByText('Current destination: Drive')).toBeInTheDocument();
    expect(within(preview).getByRole('button', {name: 'Move'})).toBeEnabled();

    const selectedSourceFolder = await within(preview).findByRole('button', {name: 'Marketing images Selected'});
    expect(selectedSourceFolder).toBeDisabled();
    await user.click(await within(preview).findByRole('button', {name: 'Design reviews'}));
    expect(within(preview).getByText('Current destination: Drive / Design reviews')).toBeInTheDocument();

    await user.click(within(preview).getByRole('button', {name: 'Open Design reviews'}));
    expect(await within(preview).findByText('Current destination: Drive / Design reviews')).toBeInTheDocument();
    await user.click(await within(preview).findByRole('button', {name: 'Open Quarterly reviews'}));
    expect(
      await within(preview).findByText('Current destination: Drive / Design reviews / Quarterly reviews'),
    ).toBeInTheDocument();
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
    expect(within(reopenedPreview).getByText('Current destination: Drive')).toBeInTheDocument();
    const reopenedSelectedItems = within(reopenedPreview).getByRole('region', {name: 'Selected items'});
    expect(within(reopenedSelectedItems).getByText('Wire logs.pdf')).toBeInTheDocument();
    expect(within(reopenedSelectedItems).queryByText('Marketing images')).not.toBeInTheDocument();
    await user.click(within(reopenedPreview).getByRole('button', {name: 'cells.moveNodeModal.cancelButton'}));

    expect(repository.moveNodes).not.toHaveBeenCalled();
    window.location.hash = originalHash;
  });

  it('allows moving root files into a Drive folder with qualified API paths', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({
        Nodes: [{Type: 'COLLECTION', Uuid: 'destination-folder', Path: 'conversation-id@example.com/folder'}],
      }),
      moveNodes: jest.fn().mockResolvedValue({Status: 'Performed'}),
    } as unknown as CellsRepository;
    renderCellsTable({
      cellsRepository: repository,
      initialNodes: [
        createNode({id: 'destination-folder', name: 'folder', path: 'conversation-id@example.com/folder'}),
        createNode({
          id: 'recording-one',
          name: 'Recording one.mov',
          path: 'conversation-id@example.com/Recording one.mov',
          type: CellNodeType.FILE,
        }),
        createNode({
          id: 'recording-two',
          name: 'Recording two.mov',
          path: 'conversation-id@example.com/Recording two.mov',
          type: CellNodeType.FILE,
        }),
        createNode({
          id: 'test-docx',
          name: 'test.docx',
          path: 'conversation-id@example.com/test.docx',
          type: CellNodeType.FILE,
        }),
      ],
      onRefresh,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Recording one.mov'}));
    await user.click(screen.getByRole('checkbox', {name: 'Select Recording two.mov'}));
    await user.click(screen.getByRole('checkbox', {name: 'Select test.docx'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const preview = await screen.findByRole('dialog');
    await user.click(await within(preview).findByRole('button', {name: 'folder'}));

    expect(within(preview).getByText('Current destination: Drive / folder')).toBeInTheDocument();
    const moveButton = within(preview).getByRole('button', {name: 'Move'});
    expect(moveButton).toBeEnabled();

    await user.click(moveButton);
    await waitFor(() => {
      expect(repository.moveNodes).toHaveBeenCalledWith({
        currentPaths: [
          'conversation-id@example.com/Recording one.mov',
          'conversation-id@example.com/Recording two.mov',
          'conversation-id@example.com/test.docx',
        ],
        targetPath: 'conversation-id@example.com/folder',
      });
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    window.location.hash = originalHash;
  });

  it('moves to the drive root from a nested route, refreshes after Performed, and closes the preview', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web/Marketing images';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue({Status: 'Performed'}),
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

  it('does not refresh or close the preview for a background result', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const backgroundResponse = {Status: 'Background', BackgroundActions: [{JobUuid: 'move-job', Name: 'move'}]};
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue(backgroundResponse),
    } as unknown as CellsRepository;
    renderCellsTable({
      cellsRepository: repository,
      folderPath: 'wire-cells-web/Marketing images',
      onRefresh,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));

    await waitFor(() => {
      expect(onRefresh).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    window.location.hash = originalHash;
  });

  it('moves a nested file to the Drive root selected from the breadcrumb', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web/folder';
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue({Status: 'Performed'}),
    } as unknown as CellsRepository;
    renderCellsTable({
      cellsRepository: repository,
      initialNodes: [
        createNode({
          id: 'nested-file',
          name: 'aaaa-1.docx',
          path: 'wire-cells-web/folder/aaaa-1.docx',
          type: CellNodeType.FILE,
          extension: 'docx',
        }),
      ],
      onRefresh,
    });

    await user.click(screen.getByRole('checkbox', {name: 'Select aaaa-1.docx'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const preview = await screen.findByRole('dialog');
    await user.click(within(preview).getByRole('button', {name: 'cells.breadcrumb.files'}));
    expect(within(preview).getByText('Current destination: Drive')).toBeInTheDocument();
    await user.click(within(preview).getByRole('button', {name: 'Move'}));

    await waitFor(() => {
      expect(repository.moveNodes).toHaveBeenCalledWith({
        currentPaths: ['wire-cells-web/folder/aaaa-1.docx'],
        targetPath: 'conversation-id@example.com',
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
      moveNodes: jest.fn().mockResolvedValue({Status: 'Performed'}),
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
    await user.click(within(preview).getByRole('button', {name: 'A'}));

    expect(await within(preview).findByText('Current destination: Drive / A')).toBeInTheDocument();
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

  it('refreshes and closes only after a background move reaches Finished', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web/Marketing images';
    const user = userEvent.setup();
    let refreshList: () => void = noop;
    const onRefresh = jest.fn(() => {
      return refreshList();
    });
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const backgroundResponse = {
      Status: 'Background',
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
    const table = renderCellsTable({
      cellsRepository: repository,
      folderPath: 'wire-cells-web/Marketing images/Reports',
      onRefresh,
      clock,
    });
    refreshList = () => {
      return table.rerenderWithNodes([]);
    };

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));

    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(2);
    });
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', {name: 'Select Marketing images'})).toBeInTheDocument();

    await act(async () => {
      clock.advanceByMilliseconds(1000);
      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalledTimes(1);
      });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', {name: 'Select Marketing images'})).not.toBeInTheDocument();
    expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(4);
    window.location.hash = originalHash;
  });

  it('refreshes and requires review after a status lookup failure followed by terminal error', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
    const user = userEvent.setup();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const onRefresh = jest.fn();
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
    renderCellsTable({cellsRepository: repository, onRefresh, clock});

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
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('cells.bulkMove.moveNeedsReview');
    const preview = screen.getByRole('dialog');
    expect(within(preview).getByRole('button', {name: 'Move'})).toBeDisabled();
    expect(within(preview).queryByRole('button', {name: 'cells.bulkMove.reviewAndRetry'})).not.toBeInTheDocument();

    await user.click(within(preview).getByRole('button', {name: 'cells.bulkMove.refreshDrive'}));
    expect(onRefresh).toHaveBeenCalledTimes(2);
    expect(within(preview).getByRole('button', {name: 'Move'})).toBeDisabled();
    await user.click(within(preview).getByRole('button', {name: 'cells.moveNodeModal.cancelButton'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const reopenedPreview = await screen.findByRole('dialog');
    expect(within(reopenedPreview).getByRole('button', {name: 'Move'})).toBeDisabled();
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    window.location.hash = originalHash;
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
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));

    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(2);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
    expect(within(dialog).getByRole('button', {name: 'Move'})).toBeDisabled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('cells.bulkMove.moveNeedsReview');
    expect(within(dialog).queryByRole('button', {name: 'cells.bulkMove.reviewAndRetry'})).not.toBeInTheDocument();

    table.rerenderWithNodes([movedFile, failedFile]);
    expect(within(dialog).getByRole('button', {name: 'Move'})).toBeDisabled();
    table.rerenderWithNodes([]);
    expect(within(dialog).getByRole('button', {name: 'Move'})).toBeDisabled();
    table.rerenderWithNodes([movedFile, failedFile]);
    expect(within(dialog).getByRole('button', {name: 'Move'})).toBeDisabled();
    table.rerenderWithNodes([failedFile]);
    expect(within(dialog).getByRole('button', {name: 'Move'})).toBeDisabled();
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    window.location.hash = originalHash;
  });

  it('bounds status lookup retries and offers a safe status check recovery', async () => {
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
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Unknown'})
        .mockResolvedValueOnce({Status: 'Finished'}),
    } as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository, onRefresh, clock});

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
      expect(within(dialog).getByRole('alert')).toHaveTextContent('cells.bulkMove.statusUnknown');
    });
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    expect(within(dialog).getByRole('button', {name: 'Move'})).toBeDisabled();
    expect(onRefresh).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('cells.bulkMove.statusUnknown');

    await user.click(within(dialog).getByRole('button', {name: 'cells.bulkMove.checkStatus'}));
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
    expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(7);
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    window.location.hash = originalHash;
  });

  it('keeps tracking a background move after the preview is closed', async () => {
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
    renderCellsTable({cellsRepository: repository, onRefresh, clock});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: 'Move'}));
    await waitFor(() => {
      expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(1);
    });
    await user.click(within(dialog).getByRole('button', {name: 'cells.moveNodeModal.cancelButton'}));

    await act(async () => {
      clock.advanceByMilliseconds(1000);
      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalledTimes(1);
      });
    });
    expect(repository.getBackgroundMoveInfo).toHaveBeenCalledTimes(2);
    window.location.hash = originalHash;
  });

  it('fails closed with recovery guidance when a background response is missing status or job identifiers', async () => {
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockResolvedValue({}),
      getBackgroundMoveInfo: jest.fn(),
    } as unknown as CellsRepository;
    renderCellsTable({cellsRepository: repository, onRefresh});

    await user.click(screen.getByRole('checkbox', {name: 'Select Marketing images'}));
    await user.click(screen.getByRole('button', {name: 'Move'}));
    const dialog = await screen.findByRole('dialog');
    const moveButton = within(dialog).getByRole('button', {name: 'Move'});
    await user.click(moveButton);

    await waitFor(() => {
      expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    });
    expect(moveButton).toBeDisabled();
    expect(repository.getBackgroundMoveInfo).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('cells.bulkMove.statusUnknown');
    await user.click(within(dialog).getByRole('button', {name: 'cells.bulkMove.refreshDrive'}));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(moveButton).toBeDisabled();
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
    expect(submitButton).toBeDisabled();
    await user.click(submitButton);
    expect(repository.moveNodes).toHaveBeenCalledTimes(1);
    await user.click(within(dialog).getByRole('button', {name: 'cells.moveNodeModal.cancelButton'}));
    expect(dialog).toBeInTheDocument();
    resolveMove({Status: 'Performed'});
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
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

  it('disables submission when any selected node is not movable', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/Drive';
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
    await user.click(screen.getByRole('button', {name: 'Move'}));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', {name: 'Move'})).toBeDisabled();
    expect(repository.moveNodes).not.toHaveBeenCalled();
    window.location.hash = originalHash;
  });

  it('keeps a failed move explicit without adding failure UI', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id@example.com/files/wire-cells-web';
    const user = userEvent.setup();
    const repository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNodes: jest.fn().mockRejectedValue(new Error('Move failed')),
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
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    window.location.hash = originalHash;
  });
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
