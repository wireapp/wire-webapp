/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {DragEvent, useEffect, useState} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';
import {flexRender, getCoreRowModel, type Header, useReactTable} from '@tanstack/react-table';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {RestActionStatus, type RestPerformActionResponse} from 'cells-sdk-ts';
import {createPortal} from 'react-dom';

import {UploadIcon} from '@wireapp/react-ui-kit';

import {CellsSelectionBar} from 'Components/cells/common/cellsSelectionBar/cellsSelectionBar';
import {CellsBulkMovePreviewModal} from 'Components/conversation/conversationCells/cellsTable/cellsBulkMovePreviewModal/cellsBulkMovePreviewModal';
import {
  CELLS_ACTION,
  canPerformCellsAction,
  useCellsActionPermissions,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {isInRecycleBin} from 'Components/conversation/conversationCells/common/recycleBin/recycleBin';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {Conversation} from 'Repositories/entity/Conversation';
import {driveBulkActionsFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';

import {CellsFilePreviewModal} from './cellsFilePreviewModal/cellsFilePreviewModal';
import {
  bulkMoveButtonStyles,
  folderDropOverlayDescriptionStyles,
  folderDropOverlayFolderNameStyles,
  folderDropOverlayStyles,
  folderDropOverlayTitleStyles,
  folderDropTargetRowStyles,
  headerCellStyles,
  tableActionsCellStyles,
  tableCellRow,
  tableCellStyles,
  selectedTableCellRowStyles,
  selectionBarContainerStyles,
  tableStyles,
  wrapperWithRowsStyles,
  wrapperStyles,
} from './cellsTable.styles';
import {getCellsTableColumns, getCellsTableDataCellLabels} from './cellsTableColumns/cellsTableColumns';
import {CellsFilePreviewModalProvider} from './common/cellsFilePreviewModalContext/cellsFilePreviewModalContext';

import {CellsSortDirection} from '../common/cellsSortIcon/cellsSortIcon';
import {CellsSortField, SORTABLE_COLUMN_FIELD, toAriaSort} from '../common/useCellsSorting/useCellsSorting';
import {getSharedDriveDroppedFiles} from '../getSharedDriveDroppedFiles';

interface CellsTableProps {
  nodes: CellNode[];
  cellsRepository: CellsRepository;
  conversation: Conversation;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
  onRefresh: () => void;
  onCloseSearchView?: () => void;
  folderDropResetKey?: number;
  onFolderDropTargetChange?: (folderName: string | null) => void;
  onDropFilesToFolder?: (files: readonly File[], uploadPath: string) => void;
  onDropReadError: () => void;
  getDirectionFor: (field: CellsSortField) => CellsSortDirection | undefined;
  isSortingEnabled: boolean;
  onToggleSort: (field: CellsSortField) => void;
  selectionEnabled: boolean;
  selectionScopeKey: string;
  selectionBarAnchor: HTMLElement | null;
}

interface CellsTableHeaderCellProps {
  header: Header<CellNode, unknown>;
  getDirectionFor: (field: CellsSortField) => CellsSortDirection | undefined;
  isSortingEnabled: boolean;
}

const CellsTableHeaderCell = ({header, getDirectionFor, isSortingEnabled}: CellsTableHeaderCellProps) => {
  const sortField = SORTABLE_COLUMN_FIELD[header.column.id];
  const ariaSort = isSortingEnabled && isNonEmptyString(sortField) ? toAriaSort(getDirectionFor(sortField)) : undefined;

  return (
    <th
      css={headerCellStyles}
      aria-sort={ariaSort}
      style={{
        width: header.id === 'name' ? undefined : header.getSize(),
      }}
    >
      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
    </th>
  );
};

const dragEventContainsFiles = (event: DragEvent<HTMLElement>): boolean => {
  return Array.from(event.dataTransfer.types).includes('Files');
};

const preventDefaultFileDrop = (event: DragEvent<HTMLElement>): void => {
  event.preventDefault();
  event.stopPropagation();
};

export const CellsTable = ({
  nodes,
  cellsRepository,
  conversation,
  conversationQualifiedId,
  conversationName,
  onRefresh,
  onCloseSearchView,
  folderDropResetKey,
  onFolderDropTargetChange,
  onDropFilesToFolder,
  onDropReadError,
  getDirectionFor,
  isSortingEnabled,
  onToggleSort,
  selectionEnabled,
  selectionScopeKey,
  selectionBarAnchor,
}: CellsTableProps) => {
  const {translate, isFeatureToggleEnabled} = useApplicationContext();
  const canPerformCurrentDriveAction = useCellsActionPermissions();
  const isSelectionEnabled = selectionEnabled && isFeatureToggleEnabled(driveBulkActionsFeatureToggleName);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(() => {
    return new Set();
  });
  const [isBulkMovePreviewOpen, setIsBulkMovePreviewOpen] = useState(false);
  const [isBulkMoveOutcomeUnresolved, setIsBulkMoveOutcomeUnresolved] = useState(false);
  const [isBulkMoveRequestError, setIsBulkMoveRequestError] = useState(false);

  useEffect(() => {
    setSelectedNodeIds(new Set());
    setIsBulkMovePreviewOpen(false);
  }, [selectionScopeKey, isSelectionEnabled]);

  const handleBulkMoveResult = (response: RestPerformActionResponse): void => {
    if (response.Status === RestActionStatus.Performed) {
      setIsBulkMoveOutcomeUnresolved(false);
      setIsBulkMoveRequestError(false);
      onRefresh();
      return;
    }

    setIsBulkMoveOutcomeUnresolved(true);
    setIsBulkMoveRequestError(false);
  };

  const handleBulkMoveRequestError = (): void => {
    setIsBulkMoveOutcomeUnresolved(true);
    setIsBulkMoveRequestError(true);
  };

  useEffect(() => {
    const currentNodeIds = new Set<string>();
    for (const node of nodes) {
      currentNodeIds.add(node.id);
    }
    setSelectedNodeIds(currentSelection => {
      const nextSelection = new Set(currentSelection);
      for (const nodeId of currentSelection) {
        if (!currentNodeIds.has(nodeId)) {
          nextSelection.delete(nodeId);
        }
      }
      return nextSelection.size === currentSelection.size ? currentSelection : nextSelection;
    });
  }, [nodes]);

  const handleToggleSelection = (nodeId: string, isSelected: boolean): void => {
    setSelectedNodeIds(currentSelection => {
      const nextSelection = new Set(currentSelection);
      if (isSelected) {
        nextSelection.add(nodeId);
      } else {
        nextSelection.delete(nodeId);
      }
      return nextSelection;
    });
  };
  const [activeFolderDropTargetId, setActiveFolderDropTargetId] = useState<string | null>(null);
  const [activeFolderDropTargetName, setActiveFolderDropTargetName] = useState<string | null>(null);
  const labels = {
    actions: translate('cells.tableRow.actions'),
    created: translate('cells.tableRow.modified'),
    name: translate('cells.tableRow.name'),
    owner: translate('cells.tableRow.owner'),
    publicLink: translate('cells.tableRow.publicLink'),
    size: translate('cells.tableRow.size'),
    tags: translate('cells.tableRow.tags'),
  };
  const cellLabels = getCellsTableDataCellLabels(labels);

  const table = useReactTable({
    data: nodes,
    columns: getCellsTableColumns({
      cellsRepository,
      conversationQualifiedId,
      conversationName,
      labels,
      onRefresh,
      onCloseSearchView,
      getDirectionFor,
      isSortingEnabled,
      onToggleSort,
      selectedNodeIds,
      onToggleSelection: handleToggleSelection,
      selectionEnabled: isSelectionEnabled,
    }),
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;
  const selectedNodes = nodes.filter(node => {
    return selectedNodeIds.has(node.id);
  });
  const canMoveSelection =
    selectedNodes.length > 0 &&
    !isInRecycleBin() &&
    canPerformCurrentDriveAction(CELLS_ACTION.MOVE) &&
    selectedNodes.every(node => {
      return canPerformCellsAction({action: CELLS_ACTION.MOVE, selfUserDriveRole: node.selfUserDriveRole});
    });
  const tableWrapperStyles = rows.length > 0 ? [wrapperStyles, wrapperWithRowsStyles] : wrapperStyles;

  useEffect(() => {
    return () => {
      return onFolderDropTargetChange?.(null);
    };
  }, [onFolderDropTargetChange]);

  useEffect(() => {
    setActiveFolderDropTargetId(null);
    setActiveFolderDropTargetName(null);
  }, [folderDropResetKey]);

  const setActiveFolderDropTarget = (node: CellNode | null): void => {
    setActiveFolderDropTargetId(node?.id ?? null);
    setActiveFolderDropTargetName(node?.name ?? null);
    onFolderDropTargetChange?.(node?.name ?? null);
  };

  const getFolderDropHandlers = (node: CellNode) => {
    if (node.type !== CellNodeType.FOLDER || onDropFilesToFolder === undefined) {
      return {};
    }

    return {
      onDragEnter: (event: DragEvent<HTMLTableRowElement>): void => {
        if (!dragEventContainsFiles(event)) {
          return;
        }

        preventDefaultFileDrop(event);
        setActiveFolderDropTarget(node);
      },
      onDragOver: (event: DragEvent<HTMLTableRowElement>): void => {
        if (!dragEventContainsFiles(event)) {
          return;
        }

        preventDefaultFileDrop(event);
        event.dataTransfer.dropEffect = 'copy';
        setActiveFolderDropTarget(node);
      },
      onDragLeave: (event: DragEvent<HTMLTableRowElement>): void => {
        if (!dragEventContainsFiles(event)) {
          return;
        }

        preventDefaultFileDrop(event);

        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
          return;
        }

        setActiveFolderDropTarget(null);
      },
      onDrop: (event: DragEvent<HTMLTableRowElement>): void => {
        if (!dragEventContainsFiles(event)) {
          return;
        }

        preventDefaultFileDrop(event);
        setActiveFolderDropTarget(null);
        void getSharedDriveDroppedFiles(event.dataTransfer).then(result => {
          if (result.isErr) {
            onDropReadError();
            return;
          }

          onDropFilesToFolder(result.value, node.path);
        });
      },
    };
  };

  return (
    <CellsFilePreviewModalProvider>
      <div css={tableWrapperStyles}>
        {isSelectionEnabled &&
          selectionBarAnchor !== null &&
          createPortal(
            <div css={selectionBarContainerStyles}>
              {isBulkMoveOutcomeUnresolved && (
                <p role="status">
                  {isBulkMoveRequestError
                    ? translate('cells.newItemMenuModalForm.genericError')
                    : translate('cells.bulkMove.outcomeUnresolved')}
                </p>
              )}
              <CellsSelectionBar
                selectedCount={selectedNodeIds.size}
                onClear={() => {
                  return setSelectedNodeIds(new Set());
                }}
              />
              {canMoveSelection && (
                <button
                  css={bulkMoveButtonStyles}
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => {
                    return setIsBulkMovePreviewOpen(true);
                  }}
                >
                  {translate('cells.selection.move')}
                </button>
              )}
            </div>,
            selectionBarAnchor,
          )}
        {isBulkMovePreviewOpen && canMoveSelection && (
          <CellsBulkMovePreviewModal
            isOpen
            onClose={() => {
              return setIsBulkMovePreviewOpen(false);
            }}
            selectedNodes={selectedNodes}
            cellsRepository={cellsRepository}
            conversationQualifiedId={conversationQualifiedId}
            conversationName={conversationName}
            isMoveOutcomeUnresolved={isBulkMoveOutcomeUnresolved}
            isMoveRequestError={isBulkMoveRequestError}
            onMoveResult={handleBulkMoveResult}
            onMoveError={handleBulkMoveRequestError}
          />
        )}
        {activeFolderDropTargetName !== null && (
          <div css={folderDropOverlayStyles} role="status">
            <UploadIcon width={24} height={24} aria-hidden="true" />
            <p css={folderDropOverlayTitleStyles}>{translate('sharedDriveDropOverlayTitle')}</p>
            <p css={folderDropOverlayDescriptionStyles}>
              {translate('sharedDriveDropFolderOverlayDescription')}{' '}
              <span css={folderDropOverlayFolderNameStyles} title={activeFolderDropTargetName}>
                {activeFolderDropTargetName}
              </span>
            </p>
          </div>
        )}
        <table css={tableStyles}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => {
              return (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    return (
                      <CellsTableHeaderCell
                        key={header.id}
                        header={header}
                        getDirectionFor={getDirectionFor}
                        isSortingEnabled={isSortingEnabled}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </thead>
          {rows.length > 0 && (
            <tbody>
              {rows.map(row => {
                const node = row.original;
                const rowStyles = [
                  tableCellRow,
                  ...(isSelectionEnabled && selectedNodeIds.has(node.id) ? [selectedTableCellRowStyles] : []),
                  ...(activeFolderDropTargetId === node.id ? [folderDropTargetRowStyles] : []),
                ];

                return (
                  <tr
                    key={row.id}
                    css={rowStyles}
                    data-folder-drop-active={activeFolderDropTargetId === node.id || undefined}
                    aria-selected={isSelectionEnabled && selectedNodeIds.has(node.id)}
                    data-uie-name="cells-table-row"
                    {...getFolderDropHandlers(node)}
                  >
                    {row.getVisibleCells().map(cell => {
                      return (
                        <td
                          key={cell.id}
                          css={cell.column.id === 'id' ? tableActionsCellStyles : tableCellStyles}
                          data-cell={cellLabels[cell.column.id]}
                          style={{
                            width: cell.column.id == 'name' ? undefined : cell.column.getSize(),
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
        <CellsFilePreviewModal sourceConversation={conversation} />
      </div>
    </CellsFilePreviewModalProvider>
  );
};
