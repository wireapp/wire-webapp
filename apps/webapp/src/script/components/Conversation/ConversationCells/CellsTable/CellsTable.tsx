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

import {flexRender, getCoreRowModel, useReactTable} from '@tanstack/react-table';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {CellNode} from 'src/script/types/cellNode';

import {CellsFilePreviewModal} from './CellsFilePreviewModal/CellsFilePreviewModal';
import {
  headerCellStyles,
  tableActionsCellStyles,
  tableCellRow,
  tableCellStyles,
  tableStyles,
  wrapperStyles,
} from './CellsTable.styles';
import {getCellsTableColumns} from './CellsTableColumns/CellsTableColumns';
import {CellsFilePreviewModalProvider} from './common/CellsFilePreviewModalContext/CellsFilePreviewModalContext';

interface CellsTableProps {
  nodes: Array<CellNode>;
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
  onRefresh: () => void;
}

export const CellsTable = ({
  nodes,
  cellsRepository,
  conversationQualifiedId,
  conversationName,
  onRefresh,
}: CellsTableProps) => {
  const table = useReactTable({
    data: nodes,
    columns: getCellsTableColumns({
      cellsRepository,
      conversationQualifiedId,
      conversationName,
      onRefresh,
    }),
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <CellsFilePreviewModalProvider>
      <div css={wrapperStyles}>
        <table css={tableStyles}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <th
                      key={header.id}
                      css={headerCellStyles}
                      style={{
                        width: header.id == 'name' ? undefined : header.getSize(),
                      }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          {rows.length > 0 && (
            <tbody>
              {rows.map(row => (
                <tr key={row.id} css={tableCellRow}>
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      css={cell.column.id === 'id' ? tableActionsCellStyles : tableCellStyles}
                      data-cell={cell.column.id === 'id' ? undefined : cell.column.columnDef.header}
                      style={{
                        width: cell.column.id == 'name' ? undefined : cell.column.getSize(),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
        <CellsFilePreviewModal />
      </div>
    </CellsFilePreviewModalProvider>
  );
};
