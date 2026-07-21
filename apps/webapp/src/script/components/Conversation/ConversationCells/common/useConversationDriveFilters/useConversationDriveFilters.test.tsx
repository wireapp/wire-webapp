/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {renderHook} from '@testing-library/react';

import type {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import type {FilterConfig, PopoverFilterConfig} from '../CellsFiltersBar/filterConfig';

import {useConversationDriveFilters} from './useConversationDriveFilters';

const expectedFileTypeFilterItemIds = [
  'pdfs',
  'documents',
  'pictures',
  'spreadsheets',
  'presentations',
  'videos',
  'audio',
  'archives',
  'text',
];

const isFileTypePopoverFilter = (filter: FilterConfig): filter is PopoverFilterConfig =>
  filter.id === 'fileType' && filter.type === 'popover';

const cellsRepository = {} as CellsRepository;

const conversationRepository = {
  getAllCellEnabledGroupConversations: () => [],
} as unknown as ConversationRepository;

describe('useConversationDriveFilters', () => {
  it('exposes file type filter items in the required display order', () => {
    const {result} = renderHook(
      () => useConversationDriveFilters({cellsRepository, conversationRepository, translate: translateForTest}),
      {
        wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest})),
      },
    );

    const fileTypeFilter = result.current.filters.find(isFileTypePopoverFilter);

    expect(fileTypeFilter?.items.map(({id}) => id)).toEqual(expectedFileTypeFilterItemIds);
  });
});
