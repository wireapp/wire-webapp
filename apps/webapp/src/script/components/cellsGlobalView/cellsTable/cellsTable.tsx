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

import {useEffect, useState} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';
import {flexRender, getCoreRowModel, type Header, useReactTable} from '@tanstack/react-table';

import {CellsSelectionBar} from 'Components/cells/common/cellsSelectionBar/cellsSelectionBar';
import {CellsSortDirection} from 'Components/conversation/conversationCells/common/cellsSortIcon/cellsSortIcon';
import {
  CellsSortField,
  SORTABLE_COLUMN_FIELD,
  toAriaSort,
} from 'Components/conversation/conversationCells/common/useCellsSorting/useCellsSorting';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {CellNode} from 'src/script/types/cellNode';

import {CellsFilePreviewModal} from './cellsFilePreviewModal/cellsFilePreviewModal';
import {
  headerCellStyles,
  tableActionsCellStyles,
  tableCellRow,
  tableCellStyles,
  tableStyles,
  wrapperWithRowsStyles,
  wrapperStyles,
  selectedTableCellRowStyles,
} from './cellsTable.styles';
import {getCellsTableColumns, getCellsTableDataCellLabels} from './cellsTableColumns/cellsTableColumns';
import {FilePreviewProvider} from './common/cellsFilePreviewModalContext/cellsFilePreviewModalContext';

interface CellsTableProps {
  nodes: CellNode[];
  cellsRepository: CellsRepository;
  getDirectionFor: (field: CellsSortField) => CellsSortDirection | undefined;
  isSortingEnabled: boolean;
  onToggleSort: (field: CellsSortField) => void;
  selectionEnabled: boolean;
  selectionScopeKey: string;
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
      colSpan={header.colSpan}
      aria-sort={ariaSort}
      style={{
        width: header.id === 'name' ? undefined : header.getSize(),
      }}
    >
      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
    </th>
  );
};

export const CellsTable = ({
  nodes,
  cellsRepository,
  getDirectionFor,
  isSortingEnabled,
  onToggleSort,
  selectionEnabled,
  selectionScopeKey,
}: CellsTableProps) => {
  const {translate} = useApplicationContext();
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(() => {
    return new Set();
  });

  useEffect(() => {
    setSelectedNodeIds(new Set());
  }, [selectionEnabled, selectionScopeKey]);

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
  const cellLabels = getCellsTableDataCellLabels(translate);

  const table = useReactTable({
    data: nodes,
    columns: getCellsTableColumns({
      cellsRepository,
      getDirectionFor,
      isSortingEnabled,
      onToggleSort,
      translate,
      selectedNodeIds,
      onToggleSelection: handleToggleSelection,
      selectionEnabled,
    }),
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;
  const tableWrapperStyles = rows.length > 0 ? [wrapperStyles, wrapperWithRowsStyles] : wrapperStyles;

  return (
    <FilePreviewProvider>
      <div css={tableWrapperStyles}>
        {selectionEnabled && (
          <CellsSelectionBar
            selectedCount={selectedNodeIds.size}
            onClear={() => {
              return setSelectedNodeIds(new Set());
            }}
          />
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
                return (
                  <tr
                    key={row.id}
                    css={[tableCellRow, ...(selectedNodeIds.has(row.original.id) ? [selectedTableCellRowStyles] : [])]}
                    aria-selected={selectedNodeIds.has(row.original.id)}
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
      </div>
      <CellsFilePreviewModal />
    </FilePreviewProvider>
  );
};
