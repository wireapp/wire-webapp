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

import {render, screen} from '@testing-library/react';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import type {CellsRepository} from 'Repositories/cells/cellsRepository';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {CellsHeader} from './cellsHeader';

const cellsNewItemButtonLabel = 'cells.newItemMenu.button';
const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const filter = {
  type: 'toggle' as const,
  id: 'sharedViaLink' as const,
  label: 'Public links',
  isActive: false,
  onToggle: jest.fn(),
};

const defaultProperties = {
  onRefresh: jest.fn(),
  conversationName: 'Project Alpha',
  conversationQualifiedId: {id: 'conversation-id', domain: 'wire.com'},
  cellsRepository: {} as CellsRepository,
  isSearchViewOpen: true,
  isInRecycleBin: false,
  onOpenSearchView: jest.fn(),
  searchValue: '',
  onSearchChange: jest.fn(),
  onSearchClear: jest.fn(),
  filters: [filter],
  showViewerPermission: false,
};

const renderCellsHeader = (properties: Partial<typeof defaultProperties> = {}) => {
  return render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <CellsHeader {...defaultProperties} {...properties} />
    </StyledApp>,
    {wrapper: rootProviderWrapper},
  );
};

describe('CellsHeader', () => {
  it('hides search and filters while viewing the recycle bin', () => {
    renderCellsHeader({isInRecycleBin: true});

    expect(screen.queryByRole('textbox', {name: 'cells.search.placeholder'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Public links'})).not.toBeInTheDocument();
  });

  it('keeps search and filters available outside the recycle bin', () => {
    renderCellsHeader();

    expect(screen.getByRole('textbox', {name: 'cells.search.placeholder'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Public links'})).toBeInTheDocument();
  });

  it('renders the viewer permission banner when restricted', () => {
    renderCellsHeader({showViewerPermission: true, isSearchViewOpen: false});

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('conversationFileUploadRestrictedOverlayDescription')).toBeInTheDocument();
  });

  it('renders the new-item menu outside the recycle bin', () => {
    renderCellsHeader({isSearchViewOpen: false});

    expect(screen.getByRole('button', {name: cellsNewItemButtonLabel})).toBeInTheDocument();
  });

  it('does not render the new-item menu in the recycle bin', () => {
    renderCellsHeader({isInRecycleBin: true, isSearchViewOpen: false});

    expect(screen.queryByRole('button', {name: cellsNewItemButtonLabel})).not.toBeInTheDocument();
  });
});
