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
import userEvent from '@testing-library/user-event';

import {CellsHeader} from './cellsHeader';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../page/testSupport/rootContextTestSupport';
import {THEME_ID} from '../../../uiKit/identity/theme/theme';
import {StyledApp} from '../../../uiKit/layout/styledApp/styledApp';
import {translateForTest} from '../../../util/test/translateForTest';

describe('global Files header', () => {
  it('keeps search and refresh available with bulk feature toggles enabled', async () => {
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    const onSearch = jest.fn();
    const wrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        isFeatureToggleEnabled: () => {
          return true;
        },
      }),
    );
    render(
      <StyledApp themeId={THEME_ID.DEFAULT}>
        <CellsHeader
          searchValue=""
          onSearch={onSearch}
          onClearSearch={jest.fn()}
          onRefresh={onRefresh}
          searchStatus="idle"
          filters={[]}
        />
      </StyledApp>,
      {wrapper},
    );

    await user.type(screen.getByPlaceholderText('cells.search.allFilesPlaceholder'), 'a');
    await user.click(screen.getByRole('button', {name: 'cells.refreshButton'}));

    expect(screen.getByRole('heading', {name: 'cells.heading'})).toBeInTheDocument();
    expect(onSearch).toHaveBeenCalledWith('a');
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
