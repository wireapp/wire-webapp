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

import {act, renderHook} from '@testing-library/react';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {useTagsManagement} from './useTagsManagement';

import {useAllCellsTagsStore} from '../../../../../common/useAllCellsTagsStore/useAllCellsTagsStore';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

describe('useTagsManagement', () => {
  beforeEach(() => {
    useAllCellsTagsStore.setState({
      tags: ['Alpha', 'Zulu'],
      isLoading: false,
      error: null,
      hasFetched: true,
    });
  });

  it('keeps a newly created tag appended to the selected tags', () => {
    const {result} = renderHook(
      () =>
        useTagsManagement({
          cellsRepository: {} as CellsRepository,
          fetchTagsEnabled: true,
          initialSelectedTags: ['Alpha', 'Zulu'],
          commaValidationError: 'Tags cannot contain commas',
        }),
      {wrapper: rootProviderWrapper},
    );

    act(() => result.current.handleCreateOption('Beta'));

    expect(result.current.selectedTags.map(tag => tag.label)).toEqual(['Alpha', 'Zulu', 'Beta']);
  });
});
