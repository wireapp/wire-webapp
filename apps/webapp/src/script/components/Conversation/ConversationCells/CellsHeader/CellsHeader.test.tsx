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

import {ReactNode} from 'react';

import {render, screen} from '@testing-library/react';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {CellsHeader} from './CellsHeader';

const cellsNewItemButtonLabel = 'cells.newItemMenu.button';

const rootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: key => key}));

const withTheme = (component: ReactNode) => <StyledApp themeId={THEME_ID.DEFAULT}>{component}</StyledApp>;

const renderCellsHeader = () => {
  return render(
    withTheme(
      <CellsHeader
        onRefresh={jest.fn()}
        conversationName="Conversation"
        conversationQualifiedId={{id: 'conversation-id', domain: 'wire.com'}}
        cellsRepository={{} as CellsRepository}
        isSearchViewOpen={false}
        onOpenSearchView={jest.fn()}
        searchValue=""
        onSearchChange={jest.fn()}
        onSearchClear={jest.fn()}
        filters={[]}
      />,
    ),
    {wrapper: rootProviderWrapper},
  );
};

describe('CellsHeader', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('renders the new-item menu outside the recycle bin', () => {
    window.location.hash = '#/conversation/conversation-id/wire.com/files/';

    renderCellsHeader();

    expect(screen.getByRole('button', {name: cellsNewItemButtonLabel})).toBeInTheDocument();
  });

  it('does not render the new-item menu in the recycle bin', () => {
    window.location.hash = '#/conversation/conversation-id/wire.com/files/recycle_bin';

    renderCellsHeader();

    expect(screen.queryByRole('button', {name: cellsNewItemButtonLabel})).not.toBeInTheDocument();
  });
});
