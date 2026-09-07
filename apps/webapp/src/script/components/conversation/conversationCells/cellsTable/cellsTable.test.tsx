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

import {fireEvent, render, screen} from '@testing-library/react';

import {ThemeProvider} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {Conversation} from 'Repositories/entity/Conversation';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {translateForTest} from 'Util/test/translateForTest';

import {CellsTable} from './cellsTable';

import {CELLS_SELF_USER_DRIVE_ROLE} from '../common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';

const conversationQualifiedId = {id: 'conversation-id', domain: 'example.com'};

const createNode = (overrides: Partial<CellNode>): CellNode => ({
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
});

const createDataTransfer = (files: readonly File[]): DataTransfer =>
  ({
    dropEffect: 'none',
    files,
    types: ['Files'],
  }) as unknown as DataTransfer;

const renderCellsTable = ({
  folderPath = 'conversation-id@example.com/Marketing/images',
  onDropFilesToFolder = jest.fn(),
  onFolderDropTargetChange = jest.fn(),
  folderDropResetKey,
}: {
  readonly folderPath?: string;
  readonly onDropFilesToFolder?: (files: readonly File[], uploadPath: string) => void;
  readonly onFolderDropTargetChange?: (folderName: string | null) => void;
  readonly folderDropResetKey?: number;
} = {}) => {
  const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));
  const folder = createNode({id: 'folder-id', name: 'Marketing images', path: folderPath});
  const file = createNode({
    id: 'file-id',
    name: 'Wire logs.pdf',
    path: 'Wire logs.pdf',
    type: CellNodeType.FILE,
    extension: 'pdf',
  });

  const renderTable = (resetKey = folderDropResetKey) => (
    <ThemeProvider>
      <CellsTable
        nodes={[folder, file]}
        cellsRepository={{} as CellsRepository}
        conversation={{} as Conversation}
        conversationQualifiedId={conversationQualifiedId}
        conversationName="Conversation"
        onRefresh={jest.fn()}
        onFolderDropTargetChange={onFolderDropTargetChange}
        onDropFilesToFolder={onDropFilesToFolder}
        folderDropResetKey={resetKey}
        getDirectionFor={() => undefined}
        isSortingEnabled
        onToggleSort={jest.fn()}
      />
    </ThemeProvider>
  );

  const {rerender} = render(renderTable(), {wrapper});

  return {
    file,
    folder,
    onDropFilesToFolder,
    onFolderDropTargetChange,
    rerenderWithResetKey: (resetKey: number) => rerender(renderTable(resetKey)),
  };
};

describe('CellsTable folder row drop target', () => {
  it('highlights a folder row and drops files into that folder path', () => {
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

    expect(onDropFilesToFolder).toHaveBeenCalledWith([droppedFile], 'conversation-id@example.com/Marketing/images');
    expect(onFolderDropTargetChange).toHaveBeenLastCalledWith(null);
  });

  it('preserves folder row paths exactly', () => {
    const droppedFile = new File(['content'], 'document.pdf', {type: 'application/pdf'});
    const dataTransfer = createDataTransfer([droppedFile]);
    const {onDropFilesToFolder} = renderCellsTable({folderPath: 'direct-upload'});
    const folderRow = screen.getByRole('row', {name: /Marketing images/});

    fireEvent.drop(folderRow, {dataTransfer});

    expect(onDropFilesToFolder).toHaveBeenCalledWith([droppedFile], 'direct-upload');
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
