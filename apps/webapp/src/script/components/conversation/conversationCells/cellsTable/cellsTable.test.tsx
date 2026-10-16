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

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {ThemeProvider} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {Conversation} from 'Repositories/entity/Conversation';
import {
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
}: {
  readonly folderPath?: string;
  readonly onDropFilesToFolder?: (files: readonly File[], uploadPath: string) => void;
  readonly onDropReadError?: () => void;
  readonly onFolderDropTargetChange?: (folderName: string | null) => void;
  readonly folderDropResetKey?: number;
  readonly selectionEnabled?: boolean;
  readonly selectionScopeKey?: string;
  readonly isBulkActionsEnabled?: boolean;
} = {}) => {
  const wrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: translateSelectionForTest,
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
    nodes = [folder, file],
  ) => {
    return (
      <ThemeProvider>
        <CellsTable
          nodes={nodes}
          cellsRepository={{} as CellsRepository}
          conversation={{} as Conversation}
          conversationQualifiedId={conversationQualifiedId}
          conversationName="Conversation"
          onRefresh={jest.fn()}
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

  const {rerender} = render(renderTable(), {wrapper});

  return {
    file,
    folder,
    onDropFilesToFolder,
    onDropReadError,
    onFolderDropTargetChange,
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
    expect(checkboxes[0]).toHaveAccessibleName('Select Marketing images');

    fireEvent.click(checkboxes[0]);
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
