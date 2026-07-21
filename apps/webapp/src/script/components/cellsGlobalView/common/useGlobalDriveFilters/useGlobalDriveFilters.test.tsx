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
import ko from 'knockout';
import {container} from 'tsyringe';

import type {
  FilterConfig,
  PopoverFilterConfig,
} from 'Components/Conversation/ConversationCells/common/CellsFiltersBar/filterConfig';
import type {CellsRepository} from 'Repositories/cells/cellsRepository';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {Core} from 'src/script/service/coreSingleton';
import {translateForTest} from 'Util/test/translateForTest';

import {useGlobalDriveFilters} from './useGlobalDriveFilters';

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

describe('useGlobalDriveFilters', () => {
  beforeEach(() => {
    container.clearInstances();
    container.registerInstance(TeamState, {
      selfRole: ko.pureComputed(() => undefined),
      teamFeatures: ko.observable(undefined),
    } as unknown as TeamState);
    container.registerInstance(ConversationState, {
      channelConversations: ko.pureComputed(() => []),
    } as unknown as ConversationState);
    container.registerInstance(Core, {
      backendFeatures: {version: 0},
    } as unknown as Core);
  });

  it('exposes file type filter items in the required display order', () => {
    const {result} = renderHook(
      () => useGlobalDriveFilters({cellsRepository, conversationRepository, translate: translateForTest}),
      {
        wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest})),
      },
    );

    const fileTypeFilter = result.current.filters.find(isFileTypePopoverFilter);

    expect(fileTypeFilter?.items.map(({id}) => id)).toEqual(expectedFileTypeFilterItemIds);
  });
});
