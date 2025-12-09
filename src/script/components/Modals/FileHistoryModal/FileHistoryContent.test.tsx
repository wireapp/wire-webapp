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

import {render, screen, fireEvent} from '@testing-library/react';

import {withTheme} from 'src/script/auth/util/test/TestUtil';

import {FileHistoryContent} from './FileHistoryContent';
import {FileVersion} from './types';

jest.mock('Util/LocalizerUtil', () => ({
  t: (key: string, replacements?: Record<string, string>) => {
    if (replacements) {
      let result = key;
      Object.entries(replacements).forEach(([replaceKey, value]) => {
        result = result.replace(new RegExp(`\\{${replaceKey}\\}`, 'g'), value);
      });
      return result;
    }
    return key;
  },
}));

describe('FileHistoryContent', () => {
  const mockHandleDownload = jest.fn().mockResolvedValue(undefined);
  const mockHandleRestore = jest.fn();

  const mockFileVersions: Record<string, FileVersion[]> = {
    '8 Dec 2023': [
      {
        versionId: 'version-1',
        time: '10:30 AM',
        ownerName: 'John Doe',
        size: '1.2 MB',
        downloadUrl: 'https://example.com/download/version-1',
      },
      {
        versionId: 'version-2',
        time: '09:15 AM',
        ownerName: 'Jane Smith',
        size: '1.0 MB',
        downloadUrl: 'https://example.com/download/version-2',
      },
    ],
    '7 Dec 2023': [
      {
        versionId: 'version-3',
        time: '03:45 PM',
        ownerName: 'Bob Johnson',
        size: '950 KB',
        downloadUrl: 'https://example.com/download/version-3',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render file version groups by date', () => {
    render(
      withTheme(
        <FileHistoryContent
          fileVersions={mockFileVersions}
          isLoading={false}
          handleDownload={mockHandleDownload}
          handleRestore={mockHandleRestore}
        />,
      ),
    );

    expect(screen.getByText('8 Dec 2023')).toBeInTheDocument();
    expect(screen.getByText('7 Dec 2023')).toBeInTheDocument();
  });

  it('should render all versions with correct information', () => {
    render(
      withTheme(
        <FileHistoryContent
          fileVersions={mockFileVersions}
          isLoading={false}
          handleDownload={mockHandleDownload}
          handleRestore={mockHandleRestore}
        />,
      ),
    );

    expect(screen.getByText(/10:30 AM/)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('1.2 MB')).toBeInTheDocument();

    expect(screen.getByText(/09:15 AM/)).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should mark the first version as current', () => {
    render(
      withTheme(
        <FileHistoryContent
          fileVersions={mockFileVersions}
          isLoading={false}
          handleDownload={mockHandleDownload}
          handleRestore={mockHandleRestore}
        />,
      ),
    );

    // Check that 'current' label appears - text is split by whitespace so use partial matching
    const currentLabel = screen.getByText((content, element) => {
      return (element?.tagName === 'P' && element?.textContent?.includes('cells.versionHistory.current')) || false;
    });
    expect(currentLabel).toBeInTheDocument();
  });

  it('should render download buttons for all versions', () => {
    render(
      withTheme(
        <FileHistoryContent
          fileVersions={mockFileVersions}
          isLoading={false}
          handleDownload={mockHandleDownload}
          handleRestore={mockHandleRestore}
        />,
      ),
    );

    const downloadButtons = screen.getAllByText('cells.versionHistory.download');
    expect(downloadButtons).toHaveLength(3);
  });

  it('should render restore buttons for non-current versions', () => {
    render(
      withTheme(
        <FileHistoryContent
          fileVersions={mockFileVersions}
          isLoading={false}
          handleDownload={mockHandleDownload}
          handleRestore={mockHandleRestore}
        />,
      ),
    );

    const restoreButtons = screen.getAllByText('cells.versionHistory.restore');
    // Should have 2 restore buttons (excluding the current version)
    expect(restoreButtons).toHaveLength(2);
  });

  it('should not render restore button for current version', () => {
    render(
      withTheme(
        <FileHistoryContent
          fileVersions={mockFileVersions}
          isLoading={false}
          handleDownload={mockHandleDownload}
          handleRestore={mockHandleRestore}
        />,
      ),
    );

    // All versions should have download buttons
    const downloadButtons = screen.getAllByText('cells.versionHistory.download');
    expect(downloadButtons).toHaveLength(3);

    // Only 2 restore buttons (for non-current versions)
    const restoreButtons = screen.getAllByText('cells.versionHistory.restore');
    expect(restoreButtons).toHaveLength(2);
  });

  it('should call handleDownload when download button is clicked', () => {
    render(
      withTheme(
        <FileHistoryContent
          fileVersions={mockFileVersions}
          isLoading={false}
          handleDownload={mockHandleDownload}
          handleRestore={mockHandleRestore}
        />,
      ),
    );

    const downloadButtons = screen.getAllByText('cells.versionHistory.download');
    fireEvent.click(downloadButtons[0]);

    expect(mockHandleDownload).toHaveBeenCalledWith('https://example.com/download/version-1');
  });

  it('should call handleRestore when restore button is clicked', () => {
    render(
      withTheme(
        <FileHistoryContent
          fileVersions={mockFileVersions}
          isLoading={false}
          handleDownload={mockHandleDownload}
          handleRestore={mockHandleRestore}
        />,
      ),
    );

    const restoreButtons = screen.getAllByText('cells.versionHistory.restore');
    fireEvent.click(restoreButtons[0]);

    expect(mockHandleRestore).toHaveBeenCalledWith('version-2');
  });

  it('should render empty state when no versions are provided', () => {
    const {container} = render(
      withTheme(
        <FileHistoryContent
          fileVersions={{}}
          isLoading={false}
          handleDownload={mockHandleDownload}
          handleRestore={mockHandleRestore}
        />,
      ),
    );

    const dateHeadings = container.querySelectorAll('h3');
    expect(dateHeadings).toHaveLength(0);
  });

  it('should have proper aria labels for download buttons', () => {
    const {container} = render(
      withTheme(
        <FileHistoryContent
          fileVersions={mockFileVersions}
          isLoading={false}
          handleDownload={mockHandleDownload}
          handleRestore={mockHandleRestore}
        />,
      ),
    );

    // Check that download buttons have aria-labels
    const downloadButtons = container.querySelectorAll('[aria-label*="downloadAriaLabel"]');
    expect(downloadButtons.length).toBe(3); // All 3 versions should have download buttons

    // Check each button has an aria-label
    downloadButtons.forEach(button => {
      const ariaLabel = button.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('downloadAriaLabel');
    });
  });

  it('should have proper aria labels for restore buttons', () => {
    const {container} = render(
      withTheme(
        <FileHistoryContent
          fileVersions={mockFileVersions}
          isLoading={false}
          handleDownload={mockHandleDownload}
          handleRestore={mockHandleRestore}
        />,
      ),
    );

    // Check that restore buttons have aria-labels
    const restoreButtons = container.querySelectorAll('[aria-label*="restoreAriaLabel"]');
    expect(restoreButtons.length).toBe(2); // Only non-current versions have restore buttons

    // Check each button has an aria-label
    restoreButtons.forEach(button => {
      const ariaLabel = button?.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('restoreAriaLabel');
    });
  });
});
