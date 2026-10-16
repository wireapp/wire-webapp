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

import {render, screen} from '@testing-library/react';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {CellsHeader} from './cellsHeader';

describe('CellsHeader', () => {
  it('keeps the selection overlay anchor between the title and refresh action', () => {
    const onSelectionBarAnchorChange = jest.fn();
    const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));

    render(
      <StyledApp themeId={THEME_ID.DEFAULT}>
        <CellsHeader
          searchValue=""
          onSearch={jest.fn()}
          onClearSearch={jest.fn()}
          onRefresh={jest.fn()}
          searchStatus="idle"
          filters={[]}
          onSelectionBarAnchorChange={onSelectionBarAnchorChange}
        />
      </StyledApp>,
      {wrapper},
    );

    const anchor = onSelectionBarAnchorChange.mock.calls.find(([element]) => {
      return element !== null;
    })?.[0];

    expect(anchor?.parentElement).toBe(screen.getByRole('heading', {name: 'cells.heading'}).parentElement);
  });
});
