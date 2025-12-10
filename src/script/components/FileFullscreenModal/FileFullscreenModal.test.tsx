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

import {FileFullscreenModal} from './FileFullscreenModal';

jest.mock('Components/FullscreenModal/FullscreenModal', () => ({
  FullscreenModal: ({children, isOpen}: any) => (isOpen ? <div>{children}</div> : null),
}));

jest.mock('./FileHeader/FileHeader', () => ({
  FileHeader: () => <div data-uie-name="file-header">Header</div>,
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
  ImageFileView: () => <div data-uie-name="image-view">Image View</div>,
}));

jest.mock('./NoPreviewAvailable/NoPreviewAvailable', () => ({
  NoPreviewAvailable: () => <div data-uie-name="no-preview">No preview available</div>,
}));

jest.mock('./PdfViewer/PdfViewer', () => ({
  PDFViewer: () => <div data-uie-name="pdf-viewer">PDF Viewer</div>,
}));

jest.mock('Util/FileTypeUtil', () => ({
  isFileEditable: (extension: string) => ['txt', 'md', 'json'].includes(extension),
}));

jest.mock('Util/getFileTypeFromExtension/getFileTypeFromExtension', () => ({
  getFileTypeFromExtension: (extension: string) => {
    if (extension === 'pdf') {
      return 'pdf';
    }
    if (['jpg', 'png', 'gif'].includes(extension)) {
      return 'image';
    }
    return 'unknown';
  },
}));

jest.mock('Util/util', () => ({
  getFileExtensionFromUrl: (url: string) => {
    const match = url.match(/\.([^.]+)$/);
    return match ? match[1] : '';
  },
}));

describe('FileFullscreenModal - File Version Restore', () => {
  const defaultProps = {
    id: 'test-file-id',
    isOpen: true,
    onClose: jest.fn(),
    fileName: 'document',
    fileExtension: 'txt',
    fileUrl: 'https://example.com/file.txt',
    filePreviewUrl: 'https://example.com/preview.txt',
    status: 'success' as const,
    senderName: 'John Doe',
    timestamp: Date.now(),
    badges: ['badge1'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Rendering', () => {
    it('should render file header when modal is open', () => {
      render(<FileFullscreenModal {...defaultProps} />);

      expect(screen.getByTestId('file-header')).toBeInTheDocument();
    });

    it('should not render when modal is closed', () => {
      render(<FileFullscreenModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('file-header')).not.toBeInTheDocument();
    });

    it('should render editor in edit mode for editable files', () => {
      render(<FileFullscreenModal {...defaultProps} isEditMode />);

      expect(screen.getByTestId('file-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('no-preview')).not.toBeInTheDocument();
    });

    it('should render content in view mode', () => {
      render(<FileFullscreenModal {...defaultProps} isEditMode={false} />);

      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-preview')).toBeInTheDocument();
    });
  });

  describe('Edit Mode Handling', () => {
    it('should switch from edit to view mode', () => {
      const {rerender} = render(<FileFullscreenModal {...defaultProps} isEditMode />);

      expect(screen.getByTestId('file-editor')).toBeInTheDocument();

      rerender(<FileFullscreenModal {...defaultProps} isEditMode={false} />);

      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-preview')).toBeInTheDocument();
    });

    it('should not show editor for non-editable files', () => {
      render(<FileFullscreenModal {...defaultProps} filePreviewUrl="file.pdf" fileExtension="pdf" isEditMode />);

      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    });

    it('should update edit mode when prop changes', () => {
      const {rerender} = render(<FileFullscreenModal {...defaultProps} isEditMode={false} />);

      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();

      rerender(<FileFullscreenModal {...defaultProps} isEditMode />);

      expect(screen.getByTestId('file-editor')).toBeInTheDocument();
    });
  });

  describe('Content Rendering Based on File Type', () => {
    it('should render PDF viewer for PDF files', () => {
      render(<FileFullscreenModal {...defaultProps} filePreviewUrl="file.pdf" fileExtension="pdf" />);

      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    });

    it('should render image viewer for image files', () => {
      render(<FileFullscreenModal {...defaultProps} filePreviewUrl="file.png" fileExtension="png" />);

      expect(screen.getByTestId('image-view')).toBeInTheDocument();
    });

    it('should show loader when loading', () => {
      render(<FileFullscreenModal {...defaultProps} status="loading" filePreviewUrl={undefined} />);

      expect(screen.getByTestId('file-loader')).toBeInTheDocument();
    });

    it('should show no preview when unavailable', () => {
      render(<FileFullscreenModal {...defaultProps} status="unavailable" />);

      expect(screen.getByTestId('no-preview')).toBeInTheDocument();
    });

    it('should show no preview when filePreviewUrl is missing', () => {
      render(<FileFullscreenModal {...defaultProps} filePreviewUrl={undefined} status="success" />);

      expect(screen.getByTestId('no-preview')).toBeInTheDocument();
    });
  });

  describe('Modal Close Behavior', () => {
    it('should reset edit mode state when closing', () => {
      const {rerender} = render(<FileFullscreenModal {...defaultProps} isEditMode />);

      expect(screen.getByTestId('file-editor')).toBeInTheDocument();

      // Close and reopen
      rerender(<FileFullscreenModal {...defaultProps} isOpen={false} isEditMode />);
      rerender(<FileFullscreenModal {...defaultProps} isOpen isEditMode={false} />);

      // Should respect the new isEditMode prop
      expect(screen.queryByTestId('file-editor')).not.toBeInTheDocument();
    });
  });

  describe('Content Refresh After Version Restore', () => {
    it('should render fresh content when component remounts', () => {
      const {rerender} = render(<FileFullscreenModal {...defaultProps} isEditMode />);

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
      );

      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();

      // Change to image
      rerender(<FileFullscreenModal {...defaultProps} filePreviewUrl="file.png" fileExtension="png" />);

      expect(screen.queryByTestId('pdf-viewer')).not.toBeInTheDocument();
      expect(screen.getByTestId('image-view')).toBeInTheDocument();
    });
  });
});
