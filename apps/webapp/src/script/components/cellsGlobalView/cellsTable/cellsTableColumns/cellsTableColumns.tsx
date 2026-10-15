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

import {CellsSortDirection} from 'Components/conversation/conversationCells/common/cellsSortIcon/cellsSortIcon';
import {CellsTableSortableHeader} from 'Components/conversation/conversationCells/common/cellsTableSortableHeader/cellsTableSortableHeader';
import {CellsSortField} from 'Components/conversation/conversationCells/common/useCellsSorting/useCellsSorting';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {RootContextValue} from 'src/script/page/rootProvider';
import {CellNode} from 'src/script/types/cellNode';

import {CellsConversationColumn} from './cellsConversationColumn/cellsConversationColumn';
import {CellsTableOwnerColumn} from './cellsOwnerColumn/cellsOwnerColumn';
import {CellsTableDateColumn} from './cellsTableDateColumn/cellsTableDateColumn';
import {CellsTableNameColumn} from './cellsTableNameColumn/cellsTableNameColumn';
import {CellsTableRowOptions} from './cellsTableRowOptions/cellsTableRowOptions';
import {CellsTableSharedColumn} from './cellsTableSharedColumn/cellsTableSharedColumn';
import {CellsTableTagsColumn} from './cellsTableTagsColumn/cellsTableTagsColumn';

const columnHelper = createColumnHelper<CellNode>();

const getCellsTableColumnLabels = (translate: RootContextValue['translate']) => {
  return {
    actions: translate('cells.tableRow.actions'),
    conversationName: translate('cells.tableRow.conversationName'),
    created: translate('cells.tableRow.modified'),
    name: translate('cells.tableRow.name'),
    owner: translate('cells.tableRow.owner'),
    publicLink: translate('cells.tableRow.publicLink'),
    size: translate('cells.tableRow.size'),
    tags: translate('cells.tableRow.tags'),
  };
};

export const getCellsTableDataCellLabels = (
  translate: RootContextValue['translate'],
): Record<string, string | undefined> => {
  const labels = getCellsTableColumnLabels(translate);

  return {
    conversationName: labels.conversationName,
    name: labels.name,
    owner: labels.owner,
    publicLink: labels.publicLink,
    sizeMb: labels.size,
    tags: labels.tags,
    uploadedAtTimestamp: labels.created,
  };
};

export const getCellsTableColumns = ({
  cellsRepository,
  translate,
  getDirectionFor,
  isSortingEnabled,
  onToggleSort,
}: {
  cellsRepository: CellsRepository;
  translate: RootContextValue['translate'];
  getDirectionFor: (field: CellsSortField) => CellsSortDirection | undefined;
  isSortingEnabled: boolean;
  onToggleSort: (field: CellsSortField) => void;
}) => {
  const labels = getCellsTableColumnLabels(translate);

  return [
    columnHelper.accessor('name', {
      header: isSortingEnabled
        ? () => {
            return (
              <CellsTableSortableHeader
                label={labels.name}
                direction={getDirectionFor('name')}
                onClick={() => {
                  return onToggleSort('name');
                }}
              />
            );
          }
        : labels.name,
      cell: info => {
        return <CellsTableNameColumn node={info.row.original} />;
      },
    }),
    columnHelper.accessor('conversationName', {
      header: labels.conversationName,
      cell: info => {
        return <CellsConversationColumn conversation={info.row.original.conversation} name={info.getValue()} />;
      },
      size: 190,
    }),
    columnHelper.accessor('owner', {
      header: labels.owner,
      cell: info => {
        return <CellsTableOwnerColumn owner={info.getValue()} user={info.row.original.user} />;
      },
      size: 175,
    }),
    columnHelper.accessor('tags', {
      header: labels.tags,
      cell: info => {
        return <CellsTableTagsColumn tags={info.getValue()} />;
      },
      size: 120,
    }),
    columnHelper.accessor('sizeMb', {
      header: isSortingEnabled
        ? () => {
            return (
              <CellsTableSortableHeader
                label={labels.size}
                direction={getDirectionFor('size')}
                onClick={() => {
                  return onToggleSort('size');
                }}
              />
            );
          }
        : labels.size,
      cell: info => {
        return info.getValue();
      },
      size: 100,
    }),
    columnHelper.accessor('uploadedAtTimestamp', {
      header: isSortingEnabled
        ? () => {
            return (
              <CellsTableSortableHeader
                label={labels.created}
                direction={getDirectionFor('mtime')}
                onClick={() => {
                  return onToggleSort('mtime');
                }}
              />
            );
          }
        : labels.created,
      cell: info => {
        return <CellsTableDateColumn timestamp={info.getValue()} />;
      },
      size: 125,
    }),
    columnHelper.accessor('publicLink', {
      header: labels.publicLink,
      cell: info => {
        return <CellsTableSharedColumn isShared={info.getValue()?.alreadyShared === true} />;
      },
      size: 60,
    }),
    columnHelper.accessor('id', {
      header: () => {
        return <span className="visually-hidden">{labels.actions}</span>;
      },
      size: 40,
      cell: info => {
        return <CellsTableRowOptions node={info.row.original} cellsRepository={cellsRepository} />;
      },
    }),
  ];
};
