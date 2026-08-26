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

import type {ReactNode} from 'react';

import {render, screen} from '@testing-library/react';

import {
  CELLS_SELF_USER_DRIVE_ROLE,
  CellsSelfUserDriveRoleProvider,
  type CellsSelfUserDriveRole,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {FileFullscreenModal} from './FileFullscreenModal';

jest.mock('Components/fullscreenModal/fullscreenModal', () => ({
  FullscreenModal: ({children, isOpen}: any) => (isOpen ? <div>{children}</div> : null),
}));

jest.mock('./FileHeader/FileHeader', () => ({
  FileHeader: ({showViewOnlyLabel}: {showViewOnlyLabel?: boolean}) => (
    <div data-uie-name="file-header" data-show-view-only-label={String(showViewOnlyLabel === true)}>
      Header
    </div>
  ),
}));

jest.mock('./FileEditor/FileEditor', () => {
  let renderCount = 0;
  return {
    FileEditor: ({id}: {id: string; key?: number}) => {
      renderCount++;
      return (
        <div data-uie-name="file-editor" data-render-count={renderCount}>
          Editor for {id}
        </div>
      );
    },
  };
});

jest.mock('./FileLoader/FileLoader', () => ({
  FileLoader: () => <div data-uie-name="file-loader">Loading...</div>,
}));

jest.mock('./ImageFileView/ImageFileView', () => ({
  ImageFileView: ({src}: {src?: string}) => (
    <div data-uie-name="image-view" data-src={src}>
      Image View
    </div>
  ),
}));

jest.mock('./NoPreviewAvailable/NoPreviewAvailable', () => ({
  NoPreviewAvailable: () => <div data-uie-name="no-preview">No preview available</div>,
}));

jest.mock('./PdfViewer/PdfViewer', () => ({
  PDFViewer: () => <div data-uie-name="pdf-viewer">PDF Viewer</div>,
}));

interface CreateWrapperOptions {
  isViewerPermissionFeatureEnabled?: boolean;
  selfUserDriveRole?: CellsSelfUserDriveRole;
}

describe('FileFullscreenModal - File Version Restore', () => {
  const createWrapper = ({
    isViewerPermissionFeatureEnabled = false,
    selfUserDriveRole = CELLS_SELF_USER_DRIVE_ROLE.EDITOR,
  }: CreateWrapperOptions = {}) => {
    const RootProviderWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        isFeatureToggleEnabled: () => isViewerPermissionFeatureEnabled,
        translate: key => key,
      }),
    );

    return ({children}: {children: ReactNode}) => (
      <RootProviderWrapper>
        <CellsSelfUserDriveRoleProvider selfUserDriveRole={selfUserDriveRole}>
          {children}
        </CellsSelfUserDriveRoleProvider>
      </RootProviderWrapper>
    );
  };
  const wrapper = createWrapper();

  const defaultProps = {
    id: 'test-file-id',
    isOpen: true,
    onClose: jest.fn(),
    fileName: 'document',
    fileExtension: 'csv',
    fileUrl: 'https://example.com/file.csv',
    filePreviewUrl: 'https://example.com/preview.csv',
    status: 'success' as const,
    senderName: 'John Doe',
    timestamp: Date.now(),
    badges: ['badge1'],
  };

  describe('Modal Rendering', () => {
    it('should render file header when modal is open', () => {
      render(<FileFullscreenModal {...defaultProps} />, {wrapper});

      expect(screen.getByTestId('file-header')).toBeInTheDocument();
    });

    it('should not render when modal is closed', () => {
      render(<FileFullscreenModal {...defaultProps} isOpen={false} />, {wrapper});

      expect(screen.queryByTestId('file-header')).not.toBeInTheDocument();
    });

    it('should render editor in edit mode for editable files', () => {
      render(<FileFullscreenModal {...defaultProps} isEditMode />, {wrapper});

      expect(screen.getByTestId('file-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('no-preview')).not.toBeInTheDocument();
    });

    it('should render content in view mode', () => {
      render(<FileFullscreenModal {...defaultProps} isEditMode={false} />, {wrapper});

      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-preview')).toBeInTheDocument();
    });
  });

  describe('Edit Mode Handling', () => {
    it('should switch from edit to view mode', () => {
      const {rerender} = render(<FileFullscreenModal {...defaultProps} isEditMode />, {wrapper});

      expect(screen.getByTestId('file-editor')).toBeInTheDocument();

      rerender(<FileFullscreenModal {...defaultProps} isEditMode={false} />);

      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-preview')).toBeInTheDocument();
    });

    it('should not show editor for non-editable files', () => {
      render(<FileFullscreenModal {...defaultProps} filePreviewUrl="file.pdf" fileExtension="pdf" isEditMode />, {
        wrapper,
      });

      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    });

    it('should update edit mode when prop changes', () => {
      const {rerender} = render(<FileFullscreenModal {...defaultProps} isEditMode={false} />, {wrapper});

      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();

      rerender(<FileFullscreenModal {...defaultProps} isEditMode />);

      expect(screen.getByTestId('file-editor')).toBeInTheDocument();
    });
  });

  describe('Content Rendering Based on File Type', () => {
    it('should render PDF viewer for PDF files', () => {
      render(<FileFullscreenModal {...defaultProps} filePreviewUrl="file.pdf" fileExtension="pdf" />, {wrapper});

      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    });

    it('should render image viewer for image files', () => {
      render(<FileFullscreenModal {...defaultProps} filePreviewUrl="file.png" fileExtension="png" />, {wrapper});

      expect(screen.getByTestId('image-view')).toBeInTheDocument();
    });

    it('should show loader when loading', () => {
      render(<FileFullscreenModal {...defaultProps} status="loading" filePreviewUrl={undefined} />, {wrapper});

      expect(screen.getByTestId('file-loader')).toBeInTheDocument();
    });

    it('should show no preview when unavailable', () => {
      render(<FileFullscreenModal {...defaultProps} status="unavailable" />, {wrapper});

      expect(screen.getByTestId('no-preview')).toBeInTheDocument();
    });

    it('should show no preview when filePreviewUrl is missing', () => {
      render(<FileFullscreenModal {...defaultProps} filePreviewUrl={undefined} status="success" />, {wrapper});

      expect(screen.getByTestId('no-preview')).toBeInTheDocument();
    });

    it('should pass viewer access state to header for restricted viewers when preview url is available', () => {
      render(<FileFullscreenModal {...defaultProps} filePreviewUrl="file.xlsx" fileExtension="xlsx" />, {
        wrapper: createWrapper({
          isViewerPermissionFeatureEnabled: true,
          selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
        }),
      });

      expect(screen.getByTestId('file-header')).toHaveAttribute('data-show-view-only-label', 'true');
    });

    it('should pass viewer access state to header for restricted viewers when preview is unavailable', () => {
      render(<FileFullscreenModal {...defaultProps} status="unavailable" />, {
        wrapper: createWrapper({
          isViewerPermissionFeatureEnabled: true,
          selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
        }),
      });

      expect(screen.getByTestId('file-header')).toHaveAttribute('data-show-view-only-label', 'true');
    });

    it('should pass viewer access state to header for restricted viewers on editable files without preview', () => {
      render(
        <FileFullscreenModal
          {...defaultProps}
          fileExtension="docx"
          filePreviewUrl={undefined}
          status="unavailable"
          isEditMode
        />,
        {
          wrapper: createWrapper({
            isViewerPermissionFeatureEnabled: true,
            selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
          }),
        },
      );

      expect(screen.getByTestId('file-header')).toHaveAttribute('data-show-view-only-label', 'true');
      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();
    });
  });

  describe('Modal Close Behavior', () => {
    it('should reset edit mode state when closing', () => {
      const {rerender} = render(<FileFullscreenModal {...defaultProps} isEditMode />, {wrapper});

      expect(screen.getByTestId('file-editor')).toBeInTheDocument();

      // Close and reopen
      rerender(<FileFullscreenModal {...defaultProps} isOpen={false} isEditMode />);
      rerender(<FileFullscreenModal {...defaultProps} isOpen isEditMode={false} />);

      // Should respect the new isEditMode prop
      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();
    });
  });

  describe('Image source selection', () => {
    it('passes the original fileUrl to the image viewer for browser-previewable formats', () => {
      render(
        <FileFullscreenModal
          {...defaultProps}
          filePreviewUrl="https://example.com/preview.jpg"
          fileExtension="jpg"
          fileUrl="https://example.com/original.jpg"
        />,
        {wrapper},
      );

      expect(screen.getByTestId('image-view')).toHaveAttribute('data-src', 'https://example.com/original.jpg');
    });

    it('passes the server-generated preview to the image viewer for HEIC files (not browser-decodable)', () => {
      render(
        <FileFullscreenModal
          {...defaultProps}
          filePreviewUrl="https://example.com/preview.jpg"
          fileExtension="heic"
          fileUrl="https://example.com/original.heic"
        />,
        {wrapper},
      );

      expect(screen.getByTestId('image-view')).toHaveAttribute('data-src', 'https://example.com/preview.jpg');
    });

    it('falls back to filePreviewUrl when fileUrl is absent for a previewable format', () => {
      render(
        <FileFullscreenModal
          {...defaultProps}
          filePreviewUrl="https://example.com/preview.jpg"
          fileExtension="jpg"
          fileUrl={undefined}
        />,
        {wrapper},
      );

      expect(screen.getByTestId('image-view')).toHaveAttribute('data-src', 'https://example.com/preview.jpg');
    });
  });

  describe('Content Refresh After Version Restore', () => {
    it('should render fresh content when component remounts', () => {
      const {rerender} = render(<FileFullscreenModal {...defaultProps} isEditMode />, {wrapper});

      const firstRender = screen.getByTestId('file-editor');
      expect(firstRender).toBeInTheDocument();

      // Simulate version restore by changing the file ID to force remount
      rerender(<FileFullscreenModal {...defaultProps} id="new-file-id" isEditMode />);

      const secondRender = screen.getByTestId('file-editor');
      expect(secondRender).toBeInTheDocument();
      expect(secondRender).toHaveTextContent('Editor for new-file-id');
    });

    it('should allow switching between different file types', () => {
      const {rerender} = render(
        <FileFullscreenModal {...defaultProps} filePreviewUrl="file.pdf" fileExtension="pdf" />,
        {wrapper},
      );

      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();

      // Change to image
      rerender(<FileFullscreenModal {...defaultProps} filePreviewUrl="file.png" fileExtension="png" />);

      expect(screen.queryByTestId('pdf-viewer')).not.toBeInTheDocument();
      expect(screen.getByTestId('image-view')).toBeInTheDocument();
    });
  });

  describe('Behavior for Recycled Files', () => {
    it('should not allow editing if file is in recycle bin', () => {
      render(<FileFullscreenModal {...defaultProps} isEditMode checkIsInRecycleBin={() => true} />, {wrapper});

      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-preview')).toBeInTheDocument();
    });

    it('should keep view mode when edit mode prop changes while file is in recycle bin', () => {
      const {rerender} = render(
        <FileFullscreenModal {...defaultProps} isEditMode={false} checkIsInRecycleBin={() => true} />,
        {wrapper},
      );

      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();

      rerender(<FileFullscreenModal {...defaultProps} isEditMode checkIsInRecycleBin={() => true} />);

      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-preview')).toBeInTheDocument();
    });

    it('should be editable and previewable if file is not in recycle bin', () => {
      const {rerender} = render(
        <FileFullscreenModal {...defaultProps} isEditMode checkIsInRecycleBin={() => false} />,
        {
          wrapper,
        },
      );

      expect(screen.getByTestId('file-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('no-preview')).not.toBeInTheDocument();

      rerender(<FileFullscreenModal {...defaultProps} isEditMode={false} checkIsInRecycleBin={() => false} />);

      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-preview')).toBeInTheDocument();
    });
  });
});
