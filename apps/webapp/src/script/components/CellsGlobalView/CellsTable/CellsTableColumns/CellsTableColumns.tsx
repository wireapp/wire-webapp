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

import {CellsSortDirection} from 'Components/Conversation/ConversationCells/common/CellsSortIcon/CellsSortIcon';
import {CellsTableSortableHeader} from 'Components/Conversation/ConversationCells/common/CellsTableSortableHeader/CellsTableSortableHeader';
import {CellsSortField} from 'Components/Conversation/ConversationCells/common/useCellsSorting/useCellsSorting';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {RootContextValue} from 'src/script/page/rootProvider';
import {CellNode} from 'src/script/types/cellNode';

import {CellsConversationColumn} from './CellsConversationColumn/CellsConversationColumn';
import {CellsTableOwnerColumn} from './CellsOwnerColumn/CellsOwnerColumn';
import {CellsTableDateColumn} from './CellsTableDateColumn/CellsTableDateColumn';
import {CellsTableNameColumn} from './CellsTableNameColumn/CellsTableNameColumn';
import {CellsTableRowOptions} from './CellsTableRowOptions/CellsTableRowOptions';
import {CellsTableSharedColumn} from './CellsTableSharedColumn/CellsTableSharedColumn';
import {CellsTableTagsColumn} from './CellsTableTagsColumn/CellsTableTagsColumn';

const columnHelper = createColumnHelper<CellNode>();

export const getCellsTableColumns = ({
  cellsRepository,
  translate,
  getDirectionFor,
  onToggleSort,
}: {
  cellsRepository: CellsRepository;
  translate: RootContextValue['translate'];
  getDirectionFor: (field: CellsSortField) => CellsSortDirection | undefined;
  onToggleSort: (field: CellsSortField) => void;
}) => [
  columnHelper.accessor('name', {
    header: () => (
      <CellsTableSortableHeader
        label={t('cells.tableRow.name')}
        direction={getDirectionFor('name_ci')}
        onClick={() => onToggleSort('name_ci')}
      />
    ),
    cell: info => <CellsTableNameColumn node={info.row.original} />,
  }),
  columnHelper.accessor('conversationName', {
    header: translate('cells.tableRow.conversationName'),
    cell: info => <CellsConversationColumn conversation={info.row.original.conversation} name={info.getValue()} />,
    size: 190,
  }),
  columnHelper.accessor('owner', {
    header: translate('cells.tableRow.owner'),
    cell: info => <CellsTableOwnerColumn owner={info.getValue()} user={info.row.original.user} />,
    size: 175,
  }),
  columnHelper.accessor('tags', {
    header: translate('cells.tableRow.tags'),
    cell: info => <CellsTableTagsColumn tags={info.getValue()} />,
    size: 120,
  }),
  columnHelper.accessor('sizeMb', {
    header: () => (
      <CellsTableSortableHeader
        label={t('cells.tableRow.size')}
        direction={getDirectionFor('size')}
        onClick={() => onToggleSort('size')}
      />
    ),
    cell: info => info.getValue(),
    size: 100,
  }),
  columnHelper.accessor('uploadedAtTimestamp', {
    header: () => (
      <CellsTableSortableHeader
        label={t('cells.tableRow.created')}
        direction={getDirectionFor('mtime')}
        onClick={() => onToggleSort('mtime')}
      />
    ),
    cell: info => <CellsTableDateColumn timestamp={info.getValue()} />,
    size: 125,
  }),
  columnHelper.accessor('publicLink', {
    header: translate('cells.tableRow.publicLink'),
    cell: info => <CellsTableSharedColumn isShared={info.getValue()?.alreadyShared === true} />,
    size: 60,
  }),
  columnHelper.accessor('id', {
    header: () => <span className="visually-hidden">{translate('cells.tableRow.actions')}</span>,
    size: 40,
    cell: info => <CellsTableRowOptions node={info.row.original} cellsRepository={cellsRepository} />,
  }),
];
