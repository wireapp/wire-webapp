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
import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {ConversationFileDownloadPermissionProvider} from 'Components/cells/ConversationFileDownloadPermission/ConversationFileDownloadPermission';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {FileHeader} from './FileHeader';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const defaultProps = {
  id: 'file-id',
  onClose: jest.fn(),
  fileName: 'document',
  fileExtension: 'pdf',
  senderName: 'Alice',
  timestamp: 1_700_000_000_000,
  fileUrl: 'https://example.com/document.pdf',
  onEditModeChange: jest.fn(),
  onFileContentRefresh: jest.fn(),
};

const renderFileHeader = (isDownloadAllowed: boolean) =>
  render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      {rootProviderWrapper({
        children: (
          <ConversationFileDownloadPermissionProvider isDownloadAllowed={isDownloadAllowed}>
            <FileHeader {...defaultProps} />
          </ConversationFileDownloadPermissionProvider>
        ),
      })}
    </StyledApp>,
  );

describe('FileHeader', () => {
  it('shows download button when downloads are allowed', () => {
    renderFileHeader(true);

    expect(screen.getByRole('button', {name: 'cells.imageFullScreenModal.downloadButton'})).toBeInTheDocument();
  });

  it('hides download button when downloads are not allowed', () => {
    renderFileHeader(false);

    expect(screen.queryByRole('button', {name: 'cells.imageFullScreenModal.downloadButton'})).not.toBeInTheDocument();
  });
});
