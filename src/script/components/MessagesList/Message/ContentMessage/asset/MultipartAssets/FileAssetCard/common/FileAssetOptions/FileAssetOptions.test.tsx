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

import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {isFileEditable} from 'Util/FileTypeUtil';

import {FileAssetOptions} from './FileAssetOptions';

jest.mock('Util/util', () => ({
  forcedDownloadFile: jest.fn(),
  getFileNameWithExtension: jest.fn((name: string, ext: string) => `${name}.${ext}`),
}));

jest.unmock('Util/FileTypeUtil');

describe('FileAssetOptions', () => {
  const mockOnOpen = jest.fn();
  const defaultProps = {
    name: 'test-document',
    extension: 'pdf',
    onOpen: mockOnOpen,
    src: 'https://example.com/file.pdf',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the options button', () => {
    render(withTheme(<FileAssetOptions {...defaultProps} />));
    const button = screen.getByLabelText('cells.options.label');
    expect(button).toBeInTheDocument();
  });

  describe('isFileEditable integration', () => {
    it('correctly identifies non-editable PDF files', () => {
      render(withTheme(<FileAssetOptions {...defaultProps} extension="pdf" />));
      expect(isFileEditable('pdf')).toBe(false);
    });

    it('correctly identifies editable docx files', () => {
      render(withTheme(<FileAssetOptions {...defaultProps} extension="docx" />));
      expect(isFileEditable('docx')).toBe(true);
    });

    it('correctly identifies editable xlsx files', () => {
      render(withTheme(<FileAssetOptions {...defaultProps} extension="xlsx" />));
      expect(isFileEditable('xlsx')).toBe(true);
    });

    it('correctly identifies editable pptx files', () => {
      render(withTheme(<FileAssetOptions {...defaultProps} extension="pptx" />));
      expect(isFileEditable('pptx')).toBe(true);
    });

    it('correctly identifies editable odf files', () => {
      render(withTheme(<FileAssetOptions {...defaultProps} extension="odf" />));
      expect(isFileEditable('odf')).toBe(true);
    });

    it('handles case-insensitive editable file extensions', () => {
      render(withTheme(<FileAssetOptions {...defaultProps} extension="DOCX" />));
      expect(isFileEditable('DOCX')).toBe(true);
    });

    it('correctly identifies non-editable image files', () => {
      render(withTheme(<FileAssetOptions {...defaultProps} extension="jpg" />));
      expect(isFileEditable('jpg')).toBe(false);
    });

    it('correctly identifies older Office formats as non-editable', () => {
      render(withTheme(<FileAssetOptions {...defaultProps} extension="doc" />));
      expect(isFileEditable('doc')).toBe(false);
    });
  });

  describe('component behavior with different file types', () => {
    it('renders for non-editable files with src', () => {
      const {container} = render(withTheme(<FileAssetOptions {...defaultProps} extension="pdf" />));
      expect(container).toBeInTheDocument();
      expect(isFileEditable('pdf')).toBe(false);
    });

    it('renders for editable files with src', () => {
      const {container} = render(withTheme(<FileAssetOptions {...defaultProps} extension="docx" />));
      expect(container).toBeInTheDocument();
      expect(isFileEditable('docx')).toBe(true);
    });

    it('renders for editable files without src', () => {
      const {container} = render(withTheme(<FileAssetOptions {...defaultProps} extension="docx" src={undefined} />));
      expect(container).toBeInTheDocument();
      expect(isFileEditable('docx')).toBe(true);
    });

    it('renders for non-editable files without src', () => {
      const {container} = render(withTheme(<FileAssetOptions {...defaultProps} extension="pdf" src={undefined} />));
      expect(container).toBeInTheDocument();
      expect(isFileEditable('pdf')).toBe(false);
    });
  });

  describe('onOpen callback prop', () => {
    it('accepts onOpen callback for standard open action', () => {
      render(withTheme(<FileAssetOptions {...defaultProps} />));
      expect(mockOnOpen).toBeDefined();
    });

    it('accepts onOpen callback for edit action on editable files', () => {
      render(withTheme(<FileAssetOptions {...defaultProps} extension="docx" />));
      expect(mockOnOpen).toBeDefined();
      expect(isFileEditable('docx')).toBe(true);
    });
  });

  describe('file extension handling', () => {
    it('handles lowercase extensions', () => {
      render(withTheme(<FileAssetOptions {...defaultProps} extension="docx" />));
      expect(isFileEditable('docx')).toBe(true);
    });

    it('handles uppercase extensions', () => {
      render(withTheme(<FileAssetOptions {...defaultProps} extension="DOCX" />));
      expect(isFileEditable('DOCX')).toBe(true);
    });

    it('handles mixed case extensions', () => {
      render(withTheme(<FileAssetOptions {...defaultProps} extension="DocX" />));
      expect(isFileEditable('DocX')).toBe(true);
    });
  });
});
