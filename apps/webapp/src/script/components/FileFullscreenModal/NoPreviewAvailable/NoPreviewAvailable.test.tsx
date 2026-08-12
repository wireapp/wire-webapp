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

import {ThemeProvider} from '@wireapp/react-ui-kit';

import * as RootProvider from 'src/script/page/rootProvider';

import {NoPreviewAvailable} from './NoPreviewAvailable';

const translate = (key: string) =>
  ({
    'fileFullscreenModal.noPreviewAvailable.title': 'No preview available',
    'fileFullscreenModal.noPreviewAvailable.description': 'Download this file to view it.',
    'fileFullscreenModal.noPreviewAvailable.callToAction': 'Download',
  })[key] ?? key;

const defaultProps = {
  fileExtension: 'zip',
  fileName: 'archive',
  fileUrl: 'https://example.com/archive.zip',
};

describe('NoPreviewAvailable', () => {
  beforeEach(() => {
    jest.spyOn(RootProvider, 'useApplicationContext').mockReturnValue({translate} as RootProvider.RootContextValue);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderPlaceholder = (isDownloadRestricted: boolean) =>
    render(
      <ThemeProvider>
        <NoPreviewAvailable {...defaultProps} isDownloadRestricted={isDownloadRestricted} />
      </ThemeProvider>,
    );

  it('hides download action when download is restricted', () => {
    renderPlaceholder(true);

    expect(screen.queryByRole('button', {name: 'Download'})).not.toBeInTheDocument();
  });

  it('shows download action when download is allowed', () => {
    renderPlaceholder(false);

    expect(screen.getByRole('button', {name: 'Download'})).toBeInTheDocument();
  });
});
