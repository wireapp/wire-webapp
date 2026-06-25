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

import {CellsTableDateColumn} from './cellsTableDateColumn/cellsTableDateColumn';
import {CellsTableNameColumn} from './cellsTableNameColumn/cellsTableNameColumn';
import {CellsTableOwnerColumn} from './cellsTableOwnerColumn/cellsTableOwnerColumn';
import {CellsTableRowOptions} from './cellsTableRowOptions/cellsTableRowOptions';
import {CellsTableSharedColumn} from './cellsTableSharedColumn/cellsTableSharedColumn';
import {CellsTagsColumn} from './cellsTagsColumn/cellsTagsColumn';

const columnHelper = createColumnHelper<CellNode>();

export const getCellsTableColumns = ({
  cellsRepository,
  conversationQualifiedId,
  conversationName,
  labels,
  onRefresh,
  onCloseSearchView,
}: {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
  labels: {
    actions: string;
    created: string;
    name: string;
    owner: string;
    publicLink: string;
    size: string;
    tags: string;
  };
  onRefresh: () => void;
  onCloseSearchView?: () => void;
}) => [
  columnHelper.accessor('name', {
    header: labels.name,
    cell: info => <CellsTableNameColumn node={info.row.original} onCloseSearchView={onCloseSearchView} />,
  }),
  columnHelper.accessor('owner', {
    header: labels.owner,
    cell: info => <CellsTableOwnerColumn owner={info.getValue()} user={info.row.original.user} />,
    size: 170,
  }),
  columnHelper.accessor('sizeMb', {
    header: labels.size,
    cell: info => info.getValue(),
    size: 100,
  }),
  columnHelper.accessor('tags', {
    header: labels.tags,
    cell: info => <CellsTagsColumn tags={info.getValue()} />,
    size: 120,
  }),
  columnHelper.accessor('uploadedAtTimestamp', {
    header: labels.created,
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
