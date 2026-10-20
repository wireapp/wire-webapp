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

import {fireEvent, render, screen} from '@testing-library/react';

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
  shouldShowLoadingSpinner = status === 'loading',
  destinationSelection?: {
    handleDestinationSelect: (path: string) => void;
    selectedDestinationPath: string;
    disabledDestinationPaths: string[];
    disabledDestinationLabels: Record<string, string>;
  },
) => {
  const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));

  return render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <CellsFoldersListModalContent
        conversationName="Engineering"
        destination={{
          folders: items,
          status,
          shouldShowLoadingSpinner,
          currentPath: 'wire-cells-web',
          handlePathChange: jest.fn(),
          onChangeModalContent: jest.fn(),
          ...destinationSelection,
        }}
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

  it('shows a visible loading status before the delayed spinner appears', () => {
    renderContent('loading', [], false);

    const loadingStatus = screen.getByRole('status');
    expect(loadingStatus).toHaveTextContent('cells.moveNodeModal.loading');
    expect(loadingStatus.closest('[aria-busy="true"]')).toBeInTheDocument();
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

    const folderButton = screen.getByRole('button', {name: 'Documents'});
    expect(folderButton).toBeInTheDocument();
    expect(folderButton.closest('[aria-busy="false"]')).toBeInTheDocument();
  });

  it('supports destination selection while keeping source and current folders disabled', () => {
    const onSelectDestination = jest.fn();
    renderContent(
      'success',
      [
        {id: 'source', name: 'Selected source', path: 'conversation/source'},
        {id: 'current', name: 'Current folder', path: 'conversation/current'},
        {id: 'destination', name: 'Design reviews', path: 'conversation/design-reviews'},
      ],
      false,
      {
        handleDestinationSelect: onSelectDestination,
        selectedDestinationPath: 'conversation/design-reviews',
        disabledDestinationPaths: ['conversation/source', 'conversation/current'],
        disabledDestinationLabels: {
          'conversation/source': 'Selected',
          'conversation/current': 'Current location',
        },
      },
    );

    const selectedSource = screen.getByRole('button', {name: 'Selected source Selected'});
    const currentFolder = screen.getByRole('button', {name: 'Current folder Current location'});
    const destination = screen.getByRole('button', {name: 'Design reviews'});

    expect(selectedSource).toBeDisabled();
    expect(currentFolder).toBeDisabled();
    expect(destination).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(destination);

    expect(onSelectDestination).toHaveBeenCalledWith('conversation/design-reviews');
  });
});
