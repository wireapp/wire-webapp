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

import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {textWithEllipsisStyles} from './CellsTableColumns.styles';
import {CellsTableDateColumn} from './CellsTableDateColumn/CellsTableDateColumn';
import {CellsTableNameColumn} from './CellsTableNameColumn/CellsTableNameColumn';
import {CellsTableRowOptions} from './CellsTableRowOptions/CellsTableRowOptions';
import {CellsTableSharedColumn} from './CellsTableSharedColumn/CellsTableSharedColumn';

import {CellNode} from '../../common/cellNode/cellNode';

const columnHelper = createColumnHelper<CellNode>();

export const getCellsTableColumns = ({cellsRepository}: {cellsRepository: CellsRepository}) => [
  columnHelper.accessor('name', {
    header: t('cellsGlobalView.tableRowName'),
    cell: info => <CellsTableNameColumn node={info.row.original} />,
  }),
  columnHelper.accessor('conversationName', {
    header: t('cellsGlobalView.tableRowConversationName'),
    cell: info => <span css={textWithEllipsisStyles}>{info.getValue()}</span>,
    size: 190,
  }),
  columnHelper.accessor('owner', {
    header: t('cellsGlobalView.tableRowOwner'),
    cell: info => <span css={textWithEllipsisStyles}>{info.getValue()}</span>,
    size: 175,
  }),
  columnHelper.accessor('sizeMb', {
    header: t('cellsGlobalView.tableRowSize'),
    cell: info => info.getValue(),
    size: 100,
  }),
  columnHelper.accessor('uploadedAtTimestamp', {
    header: t('cellsGlobalView.tableRowCreated'),
    cell: info => <CellsTableDateColumn timestamp={info.getValue()} />,
    size: 125,
  }),
  columnHelper.accessor('publicLink', {
    header: t('cellsGlobalView.tableRowPublicLink'),
    cell: info => <CellsTableSharedColumn isShared={!!info.getValue()?.alreadyShared} />,
    size: 60,
  }),
  columnHelper.accessor('id', {
    header: () => <span className="visually-hidden">{t('cellsGlobalView.tableRowActions')}</span>,
    size: 40,
    cell: info => <CellsTableRowOptions node={info.row.original} cellsRepository={cellsRepository} />,
  }),
];
