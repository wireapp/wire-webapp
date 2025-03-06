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

import {createColumnHelper, flexRender, getCoreRowModel, useReactTable} from '@tanstack/react-table';
import {container} from 'tsyringe';

import {MoreIcon} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'src/script/cells/CellsRepository';

import {
  tableStyles,
  wrapperStyles,
  headerCellStyles,
  tableCellStyles,
  actionButtonStyles,
} from './CellsGlobalView.styles';
import {useGetCellsFiles} from './useGetCellsFiles/useGetCellsFiles';

type File = {
  id: string;
  name: string;
  conversationName: string;
  owner: string;
  fileSize: string;
  uploadDate: string;
};

const columnHelper = createColumnHelper<File>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('conversationName', {
    header: 'Conversation Name',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('owner', {
    header: 'Owner',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('fileSize', {
    header: 'File Size',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('uploadDate', {
    header: 'Upload Date',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('id', {
    header: 'Actions',
    cell: () => (
      <button css={actionButtonStyles}>
        <MoreIcon />
      </button>
    ),
  }),
];

const defaultData: File[] = [
  {
    id: '1',
    name: 'Project_Report.pdf',
    conversationName: 'Team Meeting Notes',
    owner: 'John Doe',
    fileSize: '2.5 MB',
    uploadDate: '2024-03-20',
  },
  {
    id: '2',
    name: 'Design_Assets.zip',
    conversationName: 'UI/UX Design',
    owner: 'Jane Smith',
    fileSize: '15.8 MB',
    uploadDate: '2024-03-19',
  },
  {
    id: '3',
    name: 'Budget_2024.xlsx',
    conversationName: 'Financial Planning',
    owner: 'Mike Johnson',
    fileSize: '1.2 MB',
    uploadDate: '2024-03-18',
  },
  {
    id: '4',
    name: 'Presentation.pptx',
    conversationName: 'Client Meeting',
    owner: 'Sarah Wilson',
    fileSize: '8.4 MB',
    uploadDate: '2024-03-17',
  },
];

export const CellsGlobalView = ({
  cellsRepository = container.resolve(CellsRepository),
}: {
  cellsRepository?: CellsRepository;
}) => {
  const {files} = useGetCellsFiles({cellsRepository});

  const table = useReactTable({
    data: defaultData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div css={wrapperStyles}>
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
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} css={tableCellStyles}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
