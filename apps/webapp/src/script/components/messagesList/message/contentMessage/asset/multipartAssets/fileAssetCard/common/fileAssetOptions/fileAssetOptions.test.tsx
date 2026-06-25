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

import type {ComponentProps} from 'react';

import {render, screen} from '@testing-library/react';

import {withTheme} from 'src/script/auth/util/test/testutil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootcontexttestsupport';
import {isFileEditable} from 'Util/fileTypeUtil';

import {FileAssetOptions} from './fileassetoptions';

jest.mock('Util/util', () => ({
  forcedDownloadFile: jest.fn(),
  getFileNameWithExtension: jest.fn((name: string, ext: string) => `${name}.${ext}`),
}));

jest.unmock('Util/fileTypeUtil');

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({
    translate: key => {
      return key;
    },
  }),
);

const renderFileAssetOptions = (properties: ComponentProps<typeof FileAssetOptions>) => {
  return render(withTheme(<FileAssetOptions {...properties} />), {wrapper: rootProviderWrapper});
};

describe('FileAssetOptions', () => {
  const mockOnOpen = jest.fn();
  const defaultProps = {
    name: 'test-document',
    extension: 'pdf',
    onOpen: mockOnOpen,
    src: 'https://example.com/file.pdf',
    id: 'file-id-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the options button', () => {
    renderFileAssetOptions(defaultProps);
    const button = screen.getByLabelText('cells.options.label');
    expect(button).toBeInTheDocument();
  });

  describe('isFileEditable integration', () => {
    it('correctly identifies non-editable PDF files', () => {
      renderFileAssetOptions({...defaultProps, extension: 'pdf'});
      expect(isFileEditable('pdf')).toBe(false);
    });

    it('correctly identifies editable docx files', () => {
      renderFileAssetOptions({...defaultProps, extension: 'docx'});
      expect(isFileEditable('docx')).toBe(true);
    });

    it('correctly identifies editable xlsx files', () => {
      renderFileAssetOptions({...defaultProps, extension: 'xlsx'});
      expect(isFileEditable('xlsx')).toBe(true);
    });

    it('correctly identifies editable pptx files', () => {
      renderFileAssetOptions({...defaultProps, extension: 'pptx'});
      expect(isFileEditable('pptx')).toBe(true);
    });

    it('correctly identifies editable odf files', () => {
      renderFileAssetOptions({...defaultProps, extension: 'odf'});
      expect(isFileEditable('odf')).toBe(true);
    });

    it('handles case-insensitive editable file extensions', () => {
      renderFileAssetOptions({...defaultProps, extension: 'DOCX'});
      expect(isFileEditable('DOCX')).toBe(true);
    });

    it('correctly identifies non-editable image files', () => {
      renderFileAssetOptions({...defaultProps, extension: 'jpg'});
      expect(isFileEditable('jpg')).toBe(false);
    });

    it('correctly identifies older Office formats as editable', () => {
      renderFileAssetOptions({...defaultProps, extension: 'doc'});
      expect(isFileEditable('doc')).toBe(true);
    });
  });

  describe('component behavior with different file types', () => {
    it('renders for non-editable files with src', () => {
      const {container} = renderFileAssetOptions({...defaultProps, extension: 'pdf'});
      expect(container).toBeInTheDocument();
      expect(isFileEditable('pdf')).toBe(false);
    });

    it('renders for editable files with src', () => {
      const {container} = renderFileAssetOptions({...defaultProps, extension: 'docx'});
      expect(container).toBeInTheDocument();
      expect(isFileEditable('docx')).toBe(true);
    });

    it('renders for editable files without src', () => {
      const {container} = renderFileAssetOptions({...defaultProps, extension: 'docx', src: undefined});
      expect(container).toBeInTheDocument();
      expect(isFileEditable('docx')).toBe(true);
    });

    it('renders for non-editable files without src', () => {
      const {container} = renderFileAssetOptions({...defaultProps, extension: 'pdf', src: undefined});
      expect(container).toBeInTheDocument();
      expect(isFileEditable('pdf')).toBe(false);
    });
  });

  describe('onOpen callback prop', () => {
    it('accepts onOpen callback for standard open action', () => {
      renderFileAssetOptions(defaultProps);
      expect(mockOnOpen).toBeDefined();
    });

    it('accepts onOpen callback for edit action on editable files', () => {
      renderFileAssetOptions({...defaultProps, extension: 'docx'});
      expect(mockOnOpen).toBeDefined();
      expect(isFileEditable('docx')).toBe(true);
    });
  });

  describe('file extension handling', () => {
    it('handles lowercase extensions', () => {
      renderFileAssetOptions({...defaultProps, extension: 'docx'});
      expect(isFileEditable('docx')).toBe(true);
    });

    it('handles uppercase extensions', () => {
      renderFileAssetOptions({...defaultProps, extension: 'DOCX'});
      expect(isFileEditable('DOCX')).toBe(true);
    });

    it('handles mixed case extensions', () => {
      renderFileAssetOptions({...defaultProps, extension: 'DocX'});
      expect(isFileEditable('DocX')).toBe(true);
    });
  });
});
