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

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {CellsFoldersListModalContent} from './cellsFoldersListModalContent';

const renderContent = (
  status: 'idle' | 'loading' | 'success' | 'error',
  items: {id: string; name: string; path: string}[],
) => {
  const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));

  return render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <CellsFoldersListModalContent
        items={items}
        status={status}
        shouldShowLoadingSpinner={status === 'loading'}
        conversationName="Engineering"
        currentPath="wire-cells-web"
        onPathChange={jest.fn()}
        onChangeModalContent={jest.fn()}
      />
    </StyledApp>,
    {wrapper},
  );
};

describe('CellsFoldersListModalContent', () => {
  it('shows the loading spinner while folders are loading', () => {
    const {container} = renderContent('loading', []);

    expect(container.querySelector('.icon-spinner')).not.toBeNull();
    expect(screen.queryByText('cells.moveNodeModal.emptyList')).not.toBeInTheDocument();
  });

  it('shows the empty state after a successful empty folder load', () => {
    renderContent('success', []);

    expect(screen.getByText('cells.moveNodeModal.emptyList')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a visible error instead of an empty state when folders fail to load', () => {
    renderContent('error', []);

    expect(screen.getByRole('alert')).toHaveTextContent('cells.newItemMenuModalForm.genericError');
    expect(screen.queryByText('cells.moveNodeModal.emptyList')).not.toBeInTheDocument();
  });

  it('shows loaded folders after a successful non-empty folder load', () => {
    renderContent('success', [{id: 'folder-id', name: 'Documents', path: 'wire-cells-web/Documents'}]);

    expect(screen.getByRole('button', {name: 'Documents'})).toBeInTheDocument();
  });
});
