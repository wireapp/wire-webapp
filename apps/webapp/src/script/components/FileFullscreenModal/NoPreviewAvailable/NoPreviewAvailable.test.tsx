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

import {NoPreviewAvailable} from './NoPreviewAvailable';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const renderNoPreviewAvailable = (isDownloadAllowed: boolean) =>
  render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <ConversationFileDownloadPermissionProvider isDownloadAllowed={isDownloadAllowed}>
        <NoPreviewAvailable
          fileUrl="https://example.com/document.docx"
          fileName="document"
          fileExtension="docx"
        />
      </ConversationFileDownloadPermissionProvider>
    </StyledApp>,
    {wrapper: rootProviderWrapper},
  );

describe('NoPreviewAvailable', () => {
  it('shows download action when downloads are allowed', () => {
    renderNoPreviewAvailable(true);

    expect(screen.getByText('fileFullscreenModal.noPreviewAvailable.callToAction')).toBeInTheDocument();
  });

  it('hides download action when downloads are not allowed', () => {
    renderNoPreviewAvailable(false);

    expect(screen.queryByText('fileFullscreenModal.noPreviewAvailable.callToAction')).not.toBeInTheDocument();
  });
});
