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

import {render, screen, fireEvent, waitFor} from '@testing-library/react';

import {FileHistoryModal} from './FileHistoryModal';
import {useFileHistoryModal} from './hooks/useFileHistoryModal';
import {useFileVersions} from './hooks/useFileVersions';

jest.mock('./hooks/useFileHistoryModal');
jest.mock('./hooks/useFileVersions');
jest.mock('./FileHistoryHeader', () => ({
  FileHistoryHeader: ({file}: {file?: {name: string; extension: string}}) => (
    <div data-testid="file-history-header">{file?.name}</div>
  ),
}));
jest.mock('./FileHistoryContent', () => ({
  FileHistoryContent: () => <div data-testid="file-history-content">Content</div>,
}));
jest.mock('Components/FileFullscreenModal/FileLoader/FileLoader', () => ({
  FileLoader: () => <div data-testid="file-loader">Loading...</div>,
}));
jest.mock('Util/LocalizerUtil', () => ({
  t: (key: string) => key,
}));

const mockedUseFileHistoryModal = jest.mocked(useFileHistoryModal);
const mockedUseFileVersions = jest.mocked(useFileVersions);

describe('FileHistoryModal', () => {
  const mockHideModal = jest.fn();
  const mockHandleDownload = jest.fn();
  const mockHandleRestore = jest.fn();
  const mockSetToBeRestoredVersionId = jest.fn();

  const defaultFileHistoryModalState = {
    isOpen: false,
    hideModal: mockHideModal,
    nodeUuid: null as string | null,
    showModal: jest.fn(),
  };

  const defaultFileVersionsState = {
    fileVersions: {},
    isLoading: false,
    handleDownload: mockHandleDownload,
    handleRestore: mockHandleRestore,
    fileInfo: undefined as undefined,
    toBeRestoredVersionId: undefined as string | undefined,
    setToBeRestoredVersionId: mockSetToBeRestoredVersionId,
    error: undefined as string | undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseFileHistoryModal.mockReturnValue(defaultFileHistoryModalState);
    mockedUseFileVersions.mockReturnValue(defaultFileVersionsState);
  });

  it('should not render when modal is closed', () => {
    const {container} = render(<FileHistoryModal />);
    expect(container.querySelector('[data-uie-name="file-history-modal"]')).not.toBeInTheDocument();
  });

  it('should render header and content when modal is open', () => {
    mockedUseFileHistoryModal.mockReturnValue({
      ...defaultFileHistoryModalState,
      isOpen: true,
    });

    render(<FileHistoryModal />);

    expect(screen.getByTestId('file-history-header')).toBeInTheDocument();
    expect(screen.getByTestId('file-history-content')).toBeInTheDocument();
  });

  it('should render loader when loading', () => {
    mockedUseFileHistoryModal.mockReturnValue({
      ...defaultFileHistoryModalState,
      isOpen: true,
    });
    mockedUseFileVersions.mockReturnValue({
      ...defaultFileVersionsState,
      isLoading: true,
    });

    render(<FileHistoryModal />);

    expect(screen.getByTestId('file-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('file-history-content')).not.toBeInTheDocument();
  });

  it('should render restore confirmation modal when toBeRestoredVersionId is set', () => {
    mockedUseFileHistoryModal.mockReturnValue({
      ...defaultFileHistoryModalState,
      isOpen: true,
    });
    mockedUseFileVersions.mockReturnValue({
      ...defaultFileVersionsState,
      toBeRestoredVersionId: 'version-123',
    });

    render(<FileHistoryModal />);

    expect(screen.getByText('cells.versionHistory.restoreModal.title')).toBeInTheDocument();
    expect(screen.getByText('cells.versionHistory.restoreModal.description')).toBeInTheDocument();
    expect(screen.getByText('cells.versionHistory.restoreModal.cancel')).toBeInTheDocument();
    expect(screen.getByText('cells.versionHistory.restoreModal.confirm')).toBeInTheDocument();
  });

  it('should call setToBeRestoredVersionId(undefined) when cancel button is clicked', () => {
    mockedUseFileHistoryModal.mockReturnValue({
      ...defaultFileHistoryModalState,
      isOpen: true,
    });
    mockedUseFileVersions.mockReturnValue({
      ...defaultFileVersionsState,
      toBeRestoredVersionId: 'version-123',
    });

    render(<FileHistoryModal />);

    const cancelButton = screen.getByText('cells.versionHistory.restoreModal.cancel');
    fireEvent.click(cancelButton);

    expect(mockSetToBeRestoredVersionId).toHaveBeenCalledWith(undefined);
  });

  it('should call handleRestore when restore confirm button is clicked', () => {
    mockedUseFileHistoryModal.mockReturnValue({
      ...defaultFileHistoryModalState,
      isOpen: true,
    });
    mockedUseFileVersions.mockReturnValue({
      ...defaultFileVersionsState,
      toBeRestoredVersionId: 'version-123',
    });

    render(<FileHistoryModal />);

    const restoreButton = screen.getByText('cells.versionHistory.restoreModal.confirm');
    fireEvent.click(restoreButton);

    expect(mockHandleRestore).toHaveBeenCalled();
  });

  it('should show loading state on restore button when restoring', () => {
    mockedUseFileHistoryModal.mockReturnValue({
      ...defaultFileHistoryModalState,
      isOpen: true,
    });
    mockedUseFileVersions.mockReturnValue({
      ...defaultFileVersionsState,
      toBeRestoredVersionId: 'version-123',
      isLoading: true,
    });

    render(<FileHistoryModal />);

    const restoreButton = screen.getByText('cells.versionHistory.restoreModal.confirm');
    expect(restoreButton.closest('button')).toHaveAttribute('aria-busy');
  });

  it('should call setToBeRestoredVersionId(undefined) when close button in restore modal is clicked', () => {
    mockedUseFileHistoryModal.mockReturnValue({
      ...defaultFileHistoryModalState,
      isOpen: true,
    });
    mockedUseFileVersions.mockReturnValue({
      ...defaultFileVersionsState,
      toBeRestoredVersionId: 'version-123',
    });

    render(<FileHistoryModal />);

    const closeButton = screen.getByRole('button', {name: 'cells.versionHistory.closeAriaLabel'});
    fireEvent.click(closeButton);

    expect(mockSetToBeRestoredVersionId).toHaveBeenCalledWith(undefined);
  });

  it('should call hideModal when escape key is pressed', async () => {
    mockedUseFileHistoryModal.mockReturnValue({
      ...defaultFileHistoryModalState,
      isOpen: true,
    });

    render(<FileHistoryModal />);

    const modal = screen.getByRole('dialog', {hidden: true});
    fireEvent.keyDown(modal, {key: 'Escape', code: 'Escape'});

    await waitFor(() => {
      expect(mockHideModal).toHaveBeenCalled();
    });
  });

  it('should pass fileInfo to header component', () => {
    const fileInfo = {
      name: 'test-document.pdf',
      extension: 'pdf',
    };

    mockedUseFileHistoryModal.mockReturnValue({
      ...defaultFileHistoryModalState,
      isOpen: true,
    });
    mockedUseFileVersions.mockReturnValue({
      ...defaultFileVersionsState,
      fileInfo,
    });

    render(<FileHistoryModal />);

    expect(screen.getByText(fileInfo.name)).toBeInTheDocument();
  });

  it('should use correct wrapper CSS based on modal state', () => {
    mockedUseFileHistoryModal.mockReturnValue({
      ...defaultFileHistoryModalState,
      isOpen: true,
    });

    const {rerender} = render(<FileHistoryModal />);

    // Default state uses fileHistoryModalWrapperCss
    let modal = screen.getByRole('dialog', {hidden: true});
    expect(modal).toBeInTheDocument();

    // When restoring, uses fileVersionRestoreModalWrapperCss
    mockedUseFileVersions.mockReturnValue({
      ...defaultFileVersionsState,
      toBeRestoredVersionId: 'version-123',
    });

    rerender(<FileHistoryModal />);
    modal = screen.getByRole('dialog', {hidden: true});
    expect(modal).toBeInTheDocument();
  });
});
