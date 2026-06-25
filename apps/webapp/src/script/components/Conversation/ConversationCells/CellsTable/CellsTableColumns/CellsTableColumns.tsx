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

import {createColumnHelper} from '@tanstack/react-table';
import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {CellNode} from 'src/script/types/cellNode';

import {CellsTableDateColumn} from './CellsTableDateColumn/CellsTableDateColumn';
import {CellsTableNameColumn} from './CellsTableNameColumn/CellsTableNameColumn';
import {CellsTableOwnerColumn} from './CellsTableOwnerColumn/CellsTableOwnerColumn';
import {CellsTableRowOptions} from './CellsTableRowOptions/CellsTableRowOptions';
import {CellsTableSharedColumn} from './CellsTableSharedColumn/CellsTableSharedColumn';
import {CellsTagsColumn} from './CellsTagsColumn/CellsTagsColumn';

import {CellsSortDirection} from '../../common/CellsSortIcon/CellsSortIcon';
import {CellsTableSortableHeader} from '../../common/CellsTableSortableHeader/CellsTableSortableHeader';
import {CellsSortField} from '../../common/useCellsSorting/useCellsSorting';

const columnHelper = createColumnHelper<CellNode>();

interface CellsTableLabels {
  actions: string;
  created: string;
  name: string;
  owner: string;
  publicLink: string;
  size: string;
  tags: string;
}

export const getCellsTableDataCellLabels = (labels: CellsTableLabels): Record<string, string | undefined> => ({
  name: labels.name,
  owner: labels.owner,
  publicLink: labels.publicLink,
  sizeMb: labels.size,
  tags: labels.tags,
  uploadedAtTimestamp: labels.created,
});

export const getCellsTableColumns = ({
  cellsRepository,
  conversationQualifiedId,
  conversationName,
  labels,
  onRefresh,
  onCloseSearchView,
  getDirectionFor,
  onToggleSort,
}: {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
  labels: CellsTableLabels;
  onRefresh: () => void;
  onCloseSearchView?: () => void;
  getDirectionFor: (field: CellsSortField) => CellsSortDirection | undefined;
  onToggleSort: (field: CellsSortField) => void;
}) => [
  columnHelper.accessor('name', {
    header: () => (
      <CellsTableSortableHeader
        label={labels.name}
        direction={getDirectionFor('name_ci')}
        onClick={() => onToggleSort('name_ci')}
      />
    ),
    cell: info => <CellsTableNameColumn node={info.row.original} onCloseSearchView={onCloseSearchView} />,
  }),
  columnHelper.accessor('owner', {
    header: labels.owner,
    cell: info => <CellsTableOwnerColumn owner={info.getValue()} user={info.row.original.user} />,
    size: 170,
  }),
  columnHelper.accessor('sizeMb', {
    header: () => (
      <CellsTableSortableHeader
        label={labels.size}
        direction={getDirectionFor('size')}
        onClick={() => onToggleSort('size')}
      />
    ),
    cell: info => info.getValue(),
    size: 100,
  }),
  columnHelper.accessor('tags', {
    header: labels.tags,
    cell: info => <CellsTagsColumn tags={info.getValue()} />,
    size: 120,
  }),
  columnHelper.accessor('uploadedAtTimestamp', {
    header: () => (
      <CellsTableSortableHeader
        label={labels.created}
        direction={getDirectionFor('mtime')}
        onClick={() => onToggleSort('mtime')}
      />
    ),
    cell: info => <CellsTableDateColumn timestamp={info.getValue()} />,
    size: 125,
  }),
  columnHelper.accessor('publicLink', {
    header: labels.publicLink,
    cell: info => <CellsTableSharedColumn isShared={info.getValue()?.alreadyShared === true} />,
    size: 60,
  }),
  columnHelper.accessor('id', {
    header: () => <span className="visually-hidden">{labels.actions}</span>,
    size: 40,
    cell: info => {
      return (
        <CellsTableRowOptions
          node={info.row.original}
          cellsRepository={cellsRepository}
          conversationQualifiedId={conversationQualifiedId}
          conversationName={conversationName}
          onRefresh={onRefresh}
          onCloseSearchView={onCloseSearchView}
        />
      );
    },
  }),
];
