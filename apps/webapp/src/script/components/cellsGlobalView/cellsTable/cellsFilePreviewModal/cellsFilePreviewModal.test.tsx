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
import userEvent from '@testing-library/user-event';
import {container} from 'tsyringe';

import {CELLS_SELF_USER_DRIVE_ROLE} from 'Components/Conversation/ConversationCells/common/CellsSelfUserDriveRole/CellsSelfUserDriveRoleContext';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {viewerPermissionFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {CellFile, CellNodeType} from 'src/script/types/cellNode';

import {CellsFilePreviewModal} from './cellsFilePreviewModal';
import {FilePreviewProvider, useCellsFilePreviewModal} from '../common/cellsFilePreviewModalContext/cellsFilePreviewModalContext';

const translate = (key: string) =>
  ({
    'cells.imageFullScreenModal.closeButton': 'Close',
    'cells.imageFullScreenModal.downloadButton': 'Download',
    'cells.options.label': 'More options',
    'cells.options.versionHistory': 'Version History',
  })[key] ?? key;

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({
    isFeatureToggleEnabled: featureName => featureName === viewerPermissionFeatureToggleName,
    translate,
  }),
);

const viewerFile: CellFile = {
  id: 'file-id',
  type: CellNodeType.FILE,
  url: 'https://example.com/document.docx',
  path: '/document.docx',
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  name: 'document',
  extension: 'docx',
  sizeMb: '1 MB',
  previewImageUrl: 'https://example.com/document-preview.jpg',
  uploadedAtTimestamp: 1700000000000,
  owner: 'John Doe',
  conversationName: 'Team',
  tags: [],
  presignedUrlExpiresAt: null,
  user: null,
  selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
};

const OpenPreviewButton = () => {
  const {handleOpenFile} = useCellsFilePreviewModal();

  return (
    <button type="button" onClick={() => handleOpenFile(viewerFile, true)}>
      Open preview
    </button>
  );
};

describe('CellsFilePreviewModal', () => {
  beforeEach(() => {
    container.registerInstance(CellsRepository, {} as CellsRepository);
  });

  afterEach(() => {
    container.reset();
  });

  it('uses the global drive file role when rendering fullscreen actions', async () => {
    render(
      withThemeAndRootContext(
        <FilePreviewProvider>
          <OpenPreviewButton />
          <CellsFilePreviewModal />
        </FilePreviewProvider>,
        rootProviderWrapper,
      ),
    );

    await userEvent.click(screen.getByRole('button', {name: 'Open preview'}));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Download'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Editing'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'More options'})).not.toBeInTheDocument();
  });
});
