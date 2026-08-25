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

import {fireEvent, render} from '@testing-library/react';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {CELLS_SELF_USER_DRIVE_ROLE} from 'Components/Conversation/ConversationCells/common/CellsSelfUserDriveRole/CellsSelfUserDriveRoleContext';
import {viewerPermissionFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {CellFile, CellNodeType} from 'src/script/types/cellNode';
import {translateForTest} from 'Util/test/translateForTest';

import {CellsTableNameColumn} from './cellsTableNameColumn';

import {FilePreviewProvider} from '../../common/cellsFilePreviewModalContext/cellsFilePreviewModalContext';

const file: CellFile = {
  id: 'file-id',
  type: CellNodeType.FILE,
  url: 'https://example.com/file.pdf',
  path: '/file.pdf',
  mimeType: 'application/pdf',
  name: 'file.pdf',
  extension: 'pdf',
  sizeMb: '1 MB',
  uploadedAtTimestamp: 1700000000000,
  owner: 'John Doe',
  conversationName: 'Marketing Team',
  publicLink: {
    alreadyShared: false,
  },
  tags: [],
  presignedUrlExpiresAt: null,
  user: null,
  selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
};

const renderNameColumn = ({
  isViewerPermissionFeatureEnabled = true,
  selfUserDriveRole = CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
}: {
  isViewerPermissionFeatureEnabled?: boolean;
  selfUserDriveRole?: CellFile['selfUserDriveRole'];
} = {}) => {
  const portalRoot = document.createElement('div');
  portalRoot.id = 'wire-app';
  document.body.append(portalRoot);

  const wrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: translateForTest,
      isFeatureToggleEnabled: featureName =>
        featureName === viewerPermissionFeatureToggleName && isViewerPermissionFeatureEnabled,
    }),
  );

  return render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <FilePreviewProvider>
        <CellsTableNameColumn node={{...file, selfUserDriveRole}} />
      </FilePreviewProvider>
    </StyledApp>,
    {wrapper},
  );
};

describe('CellsTableNameColumn', () => {
  afterEach(() => {
    document.getElementById('wire-app')?.remove();
  });

  it('shows the viewer access icon for viewer-only files', () => {
    const {container} = renderNameColumn();

    expect(container.querySelector('[data-uie-name="cells-table-viewer-access-icon"]')).toBeInTheDocument();
  });

  it('does not show the viewer access icon for editor files', () => {
    const {container} = renderNameColumn({selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.EDITOR});

    expect(container.querySelector('[data-uie-name="cells-table-viewer-access-icon"]')).not.toBeInTheDocument();
  });

  it('does not show the viewer access icon when the viewer permission feature is disabled', () => {
    const {container} = renderNameColumn({isViewerPermissionFeatureEnabled: false});

    expect(container.querySelector('[data-uie-name="cells-table-viewer-access-icon"]')).not.toBeInTheDocument();
  });
});
