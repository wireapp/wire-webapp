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

import {useCallback, useMemo} from 'react';

import {createColumnHelper, flexRender, getCoreRowModel, useReactTable} from '@tanstack/react-table';
import {container} from 'tsyringe';

import {Button, ButtonVariant, ReloadIcon} from '@wireapp/react-ui-kit';

import {FileTypeIcon} from 'Components/Conversation/common/FileTypeIcon/FileTypeIcon';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {getFileExtension} from 'Util/util';

import {
  tableStyles,
  wrapperStyles,
  headerCellStyles,
  tableCellStyles,
  headerStyles,
  headingStyles,
  reloadIconStyles,
  loaderWrapperStyles,
} from './CellsGlobalView.styles';
import {showShareFileModal} from './CellsShareFileModal/CellsShareFileModal';
import {CellsTableLoader} from './CellsTableLoader/CellsTableLoader';
import {CellsTableRowOptions} from './CellsTableRowOptions/CellsTableRowOptions';
import {useCellsStore} from './useCellsStore';
import {useGetCellsFiles} from './useGetCellsFiles/useGetCellsFiles';

interface File {
  id: string;
  mimeType: string;
  name: string;
  sizeMb: string;
  previewUrl: string;
  uploadedAt: string;
  publicLink?: {
    uuid: string;
    url: string;
  } | null;
}

const columnHelper = createColumnHelper<File>();

export const CellsGlobalView = ({
  cellsRepository = container.resolve(CellsRepository),
}: {
  cellsRepository?: CellsRepository;
}) => {
  const {files, status, error, clearAll} = useCellsStore();
  const {refresh} = useGetCellsFiles({cellsRepository});

  const handleRefresh = useCallback(async () => {
    clearAll();
    await refresh();
  }, [refresh, clearAll]);

  const deleteFile = useCallback(
    async (uuid: string) => {
      await cellsRepository.deleteFile({uuid});
      await refresh();
    },
    [refresh],
  );

  const showDeleteFileModal = useCallback(
    ({uuid, name}: {uuid: string; name: string}) => {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {action: () => deleteFile(uuid), text: 'Delete'},
        text: {message: `This will permanently delete the file ${name} for all participants.`, title: 'Delete File'},
      });
    },
    [deleteFile],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: info => (
          <div>
            <FileTypeIcon extension={getFileExtension(info.getValue())} size={24} />
            <span>{info.getValue()}</span>
          </div>
        ),
      }),
      columnHelper.accessor('name', {
        header: 'Conversation Name',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('mimeType', {
        header: 'Mime Type',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('sizeMb', {
        header: 'Size',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('uploadedAt', {
        header: 'Uploaded At',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('id', {
        header: () => <span className="visually-hidden">Actions</span>,
        cell: info => (
          <CellsTableRowOptions
            onOpen={() => {}}
            onShare={() => showShareFileModal({uuid: info.getValue(), cellsRepository})}
            downloadUrl=""
            onDelete={() => showDeleteFileModal({uuid: info.getValue(), name: info.row.original.name})}
          />
        ),
      }),
    ],
    [showDeleteFileModal, showShareFileModal],
  );

  const table = useReactTable({
    data: files,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div css={wrapperStyles}>
      <div css={headerStyles}>
        <h2 css={headingStyles}>All Files</h2>
        <Button variant={ButtonVariant.TERTIARY} onClick={handleRefresh}>
          <ReloadIcon css={reloadIconStyles} />
          Refresh list
        </Button>
      </div>
      {status === 'success' && (
        <table css={tableStyles}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} css={headerCellStyles}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          {rows.length > 0 && (
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} css={tableCellStyles}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      )}
      {status === 'idle' && !rows.length && <div>No files found</div>}
      {status === 'loading' && (
        <div css={loaderWrapperStyles}>
          <CellsTableLoader />
        </div>
      )}
      {status === 'error' && <div>Error: {error?.message}</div>}
    </div>
  );
};
