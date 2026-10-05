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

import {ReactElement} from 'react';

import {render, screen, fireEvent} from '@testing-library/react';

import {RootProvider} from 'src/script/page/rootProvider';
import {translateForTest} from 'Util/test/translateForTest';
import {createRootContextValueForTest} from 'src/script/page/testSupport/rootContextTestSupport';

import {FileHistoryHeader} from './fileHistoryHeader';
import {useFileHistoryModal} from './hooks/useFileHistoryModal';

jest.mock('./hooks/useFileHistoryModal');

const mockedUseFileHistoryModal = jest.mocked(useFileHistoryModal);

function renderWithRootProvider(element: ReactElement) {
  return render(
    <RootProvider value={createRootContextValueForTest({translate: translateForTest})}>{element}</RootProvider>,
  );
}

describe('FileHistoryHeader', () => {
  const mockHideModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseFileHistoryModal.mockReturnValue({
      hideModal: mockHideModal,
      isOpen: true,
      nodeUuid: 'test-uuid',
      showModal: jest.fn(),
    });
  });

  it('should render the header with title', () => {
    renderWithRootProvider(<FileHistoryHeader />);

    expect(screen.getByText('cells.versionHistory.title')).toBeInTheDocument();
  });

  it('should render file information when provided', () => {
    const fileInfo = {
      name: 'test-document.pdf',
      extension: 'pdf',
    };

    renderWithRootProvider(<FileHistoryHeader file={fileInfo} />);

    expect(screen.getByText(fileInfo.name)).toBeInTheDocument();
  });

  it('should render loader when file info is not provided', () => {
    renderWithRootProvider(<FileHistoryHeader />);

    // FileLoader renders a loading state
    expect(screen.queryByText('test-document.pdf')).not.toBeInTheDocument();
  });

  it('should call hideModal when close button is clicked', () => {
    renderWithRootProvider(<FileHistoryHeader />);

    const closeButton = screen.getByRole('button', {name: 'cells.versionHistory.closeAriaLabel'});
    fireEvent.click(closeButton);

    expect(mockHideModal).toHaveBeenCalledTimes(1);
  });

  it('should have proper data attribute on close button', () => {
    renderWithRootProvider(<FileHistoryHeader />);

    const closeButton = screen.getByRole('button', {name: 'cells.versionHistory.closeAriaLabel'});
    expect(closeButton).toHaveAttribute('data-uie-name', 'do-close-file-history');
  });
});
