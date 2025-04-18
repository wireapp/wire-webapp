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

import {CSSProperties, useCallback, useMemo} from 'react';

import {createColumnHelper, flexRender, getCoreRowModel, useReactTable} from '@tanstack/react-table';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';
import {forcedDownloadFile} from 'Util/util';

import {showShareFileModal} from './CellsFileShareModal/CellsFileShareModal';
import {showCellsImagePreviewModal} from './CellsImagePreviewModal/CellsImagePreviewModal';
import {
  headerCellStyles,
  tableActionsCellStyles,
  tableCellRow,
  tableCellStyles,
  tableStyles,
  wrapperStyles,
} from './CellsTable.styles';
import {CellsTableDateColumn} from './CellsTableDateColumn/CellsTableDateColumn';
import {CellsTableNameColumn} from './CellsTableNameColumn/CellsTableNameColumn';
import {CellsTableRowOptions} from './CellsTableRowOptions/CellsTableRowOptions';
import {CellsTableSharedColumn} from './CellsTableSharedColumn/CellsTableSharedColumn';
import {useTableResizeObserver} from './useTableResizeObserver/useTableResizeObserver';

import {CellFile} from '../common/cellFile/cellFile';

interface CellsTableProps {
  files: CellFile[];
  cellsRepository: CellsRepository;
  conversationId: string;
  fixedWidths?: number[];
  onDeleteFile: (uuid: string) => void;
  onUpdateBodyHeight: (height: number) => void;
  onUpdateColumnWidths: (widths: number[]) => void;
}

const columnHelper = createColumnHelper<CellFile>();

export const CellsTable = ({
  files,
  cellsRepository,
  conversationId,
  fixedWidths,
  onDeleteFile,
  onUpdateBodyHeight,
  onUpdateColumnWidths,
}: CellsTableProps) => {
  const {tableBodyRef, callbackRef} = useTableResizeObserver({
    files,
    onUpdateBodyHeight,
    onUpdateColumnWidths,
  });

  const showDeleteFileModal = useCallback(
    ({uuid, name}: {uuid: string; name: string}) => {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {action: () => onDeleteFile(uuid), text: t('cellsGlobalView.optionDelete')},
        text: {
          message: t('cellsGlobalView.deleteModalDescription', {name}),
          title: t('cellsGlobalView.deleteModalHeading'),
        },
      });
    },
    [onDeleteFile],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: t('cellsGlobalView.tableRowName'),
        cell: info => (
          <CellsTableNameColumn
            name={info.getValue()}
            previewUrl={info.row.original.previewImageUrl}
            mimeType={info.row.original.mimeType}
          />
        ),
      }),
      columnHelper.accessor('owner', {
        header: t('cellsGlobalView.tableRowOwner'),
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('sizeMb', {
        header: t('cellsGlobalView.tableRowSize'),
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('uploadedAtTimestamp', {
        header: t('cellsGlobalView.tableRowCreated'),
        cell: info => <CellsTableDateColumn timestamp={info.getValue()} />,
      }),
      columnHelper.accessor('publicLink', {
        header: t('cellsGlobalView.tableRowPublicLink'),
        cell: info => <CellsTableSharedColumn isShared={!!info.getValue()?.alreadyShared} />,
      }),
      columnHelper.accessor('id', {
        header: () => <span className="visually-hidden">{t('cellsGlobalView.tableRowActions')}</span>,
        cell: info => {
          const {previewImageUrl, fileUrl} = info.row.original;
          const uuid = info.getValue();
          return (
            <CellsTableRowOptions
              onOpen={
                previewImageUrl
                  ? () => {
                      showCellsImagePreviewModal({imageSrc: previewImageUrl});
                    }
                  : undefined
              }
              onShare={() => showShareFileModal({uuid, conversationId, cellsRepository})}
              onDownload={fileUrl ? () => forcedDownloadFile({url: fileUrl, name: info.row.original.name}) : undefined}
              onDelete={() => showDeleteFileModal({uuid, name: info.row.original.name})}
            />
          );
        },
      }),
    ],
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showDeleteFileModal],
  );

  const table = useReactTable({
    data: files,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div css={wrapperStyles}>
      <table css={tableStyles}>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => {
                const shouldSetFixedWidth = fixedWidths && fixedWidths[index] && index < headerGroup.headers.length - 1;

                return (
                  <th
                    key={header.id}
                    css={headerCellStyles}
                    style={
                      {
                        '--column-width': shouldSetFixedWidth ? `${fixedWidths[index]}px` : undefined,
                      } as CSSProperties
                    }
                    ref={element => callbackRef(element, index)}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        {rows.length > 0 && (
          <tbody ref={tableBodyRef}>
            {rows.map(row => (
              <tr key={row.id} css={tableCellRow}>
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    css={cell.column.id === 'id' ? tableActionsCellStyles : tableCellStyles}
                    data-cell={cell.column.id === 'id' ? undefined : cell.column.columnDef.header}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
};
