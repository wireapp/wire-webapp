/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {render, screen} from '@testing-library/react';
import {container} from 'tsyringe';

import {
  CELLS_SELF_USER_DRIVE_ROLE,
  CellsSelfUserDriveRoleProvider,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {FilePreviewModal} from './FilePreviewModal';

const defaultProps = {
  id: 'file-id',
  fileUrl: 'https://example.com/file.txt',
  fileName: 'file',
  fileExtension: 'txt',
  senderName: 'Sender',
  timestamp: 1700000000000,
  isOpen: true,
  onClose: jest.fn(),
  isLoading: false,
  isError: false,
};

const renderFilePreviewModal = ({isViewerPermissionFeatureEnabled}: {isViewerPermissionFeatureEnabled: boolean}) => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      isFeatureToggleEnabled: () => isViewerPermissionFeatureEnabled,
      translate: key => key,
    }),
  );

  return render(
    withThemeAndRootContext(
      <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.VIEWER}>
        <FilePreviewModal {...defaultProps} />
      </CellsSelfUserDriveRoleProvider>,
      rootProviderWrapper,
    ),
  );
};

describe('FilePreviewModal', () => {
  beforeEach(() => {
    container.registerInstance(CellsRepository, {} as CellsRepository);
  });

  afterEach(() => {
    container.reset();
  });

  it('hides download for a conversation viewer when viewer permissions are enabled', async () => {
    renderFilePreviewModal({isViewerPermissionFeatureEnabled: true});

    await screen.findByRole('dialog');

    expect(screen.queryByRole('button', {name: 'cells.imageFullScreenModal.downloadButton'})).not.toBeInTheDocument();
  });

  it('shows download when viewer permissions are disabled', async () => {
    renderFilePreviewModal({isViewerPermissionFeatureEnabled: false});

    expect(await screen.findByRole('button', {name: 'cells.imageFullScreenModal.downloadButton'})).toBeInTheDocument();
  });
});
