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

import {
  CELLS_SELF_USER_DRIVE_ROLE,
  CellsSelfUserDriveRoleProvider,
  type CellsSelfUserDriveRole,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {NoPreviewAvailable} from './noPreviewAvailable';

const translate = (key: string) => {
  return (
    {
      'fileFullscreenModal.noPreviewAvailable.title': 'No preview available',
      'fileFullscreenModal.noPreviewAvailable.description': 'Download this file to view it.',
      'fileFullscreenModal.noPreviewAvailable.viewerDescription':
        "Previews aren't available for this file type, and viewers can't download files.",
      'fileFullscreenModal.noPreviewAvailable.callToAction': 'Download',
    }[key] ?? key
  );
};

const defaultProps = {
  fileExtension: 'zip',
  fileName: 'archive',
  fileUrl: 'https://example.com/archive.zip',
};

const createWrapper = () => {
  return createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate,
    }),
  );
};

describe('NoPreviewAvailable', () => {
  const renderPlaceholder = (selfUserDriveRole: CellsSelfUserDriveRole) => {
    return render(
      withThemeAndRootContext(
        <CellsSelfUserDriveRoleProvider selfUserDriveRole={selfUserDriveRole}>
          <NoPreviewAvailable {...defaultProps} />
        </CellsSelfUserDriveRoleProvider>,
        createWrapper(),
      ),
    );
  };

  it('hides download action when download is restricted', () => {
    renderPlaceholder(CELLS_SELF_USER_DRIVE_ROLE.VIEWER);

    expect(screen.queryByRole('button', {name: 'Download'})).not.toBeInTheDocument();
  });

  it('shows viewer-specific message when download is restricted', () => {
    renderPlaceholder(CELLS_SELF_USER_DRIVE_ROLE.VIEWER);

    expect(
      screen.getByText("Previews aren't available for this file type, and viewers can't download files."),
    ).toBeInTheDocument();
  });

  it('shows download action when download is allowed', () => {
    renderPlaceholder(CELLS_SELF_USER_DRIVE_ROLE.EDITOR);

    expect(screen.getByRole('button', {name: 'Download'})).toBeInTheDocument();
    expect(screen.getByText('Download this file to view it.')).toBeInTheDocument();
  });
});
