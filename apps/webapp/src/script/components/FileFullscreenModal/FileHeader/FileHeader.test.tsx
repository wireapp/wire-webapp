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
import {container} from 'tsyringe';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {FileHeader} from './FileHeader';

const translate = (key: string) =>
  ({
    'cells.imageFullScreenModal.closeButton': 'Close',
    'cells.imageFullScreenModal.downloadButton': 'Download',
    'cells.options.label': 'More options',
    'cells.options.versionHistory': 'Version History',
  })[key] ?? key;

const defaultProps = {
  id: 'file-id',
  onClose: jest.fn(),
  fileName: 'document',
  fileExtension: 'pdf',
  fileUrl: 'https://example.com/document.pdf',
  senderName: 'John Doe',
  timestamp: 1700000000000,
  onEditModeChange: jest.fn(),
  onFileContentRefresh: jest.fn(),
};

const rootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate}));

describe('FileHeader', () => {
  beforeEach(() => {
    container.registerInstance(CellsRepository, {} as CellsRepository);
  });

  afterEach(() => {
    container.reset();
  });

  const renderHeader = (props: Partial<Parameters<typeof FileHeader>[0]> = {}) =>
    render(withThemeAndRootContext(<FileHeader {...defaultProps} {...props} />, rootProviderWrapper));

  it('hides download action when download is restricted', () => {
    renderHeader({isDownloadRestricted: true});

    expect(screen.queryByRole('button', {name: 'Download'})).not.toBeInTheDocument();
  });

  it('shows download action when download is allowed', () => {
    renderHeader({isDownloadRestricted: false});

    expect(screen.getByRole('button', {name: 'Download'})).toBeInTheDocument();
  });
});
