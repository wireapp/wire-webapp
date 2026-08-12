/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {render} from '@testing-library/react';

import {FileFullscreenModal} from 'Components/FileFullscreenModal/FileFullscreenModal';
import {
  CELLS_SELF_USER_DRIVE_ROLE,
  CellsSelfUserDriveRoleProvider,
} from 'Components/Conversation/ConversationCells/common/CellsSelfUserDriveRole/CellsSelfUserDriveRoleContext';
import * as RootProvider from 'src/script/page/rootProvider';

import {FilePreviewModal} from './FilePreviewModal';

jest.mock('Components/FileFullscreenModal/FileFullscreenModal', () => ({
  FileFullscreenModal: jest.fn(() => null),
}));

const defaultProps = {
  id: 'file-id',
  fileUrl: 'https://example.com/file.pdf',
  fileName: 'file',
  fileExtension: 'pdf',
  senderName: 'Sender',
  timestamp: 1700000000000,
  isOpen: true,
  onClose: jest.fn(),
  isLoading: false,
  isError: false,
};

const mockedFileFullscreenModal = jest.mocked(FileFullscreenModal);

describe('FilePreviewModal', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockedFileFullscreenModal.mockClear();
  });

  it('restricts download for a conversation viewer when viewer permissions are enabled', () => {
    jest.spyOn(RootProvider, 'useApplicationContext').mockReturnValue({
      isFeatureToggleEnabled: jest.fn(() => true),
    } as unknown as RootProvider.RootContextValue);

    render(
      <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.VIEWER}>
        <FilePreviewModal {...defaultProps} />
      </CellsSelfUserDriveRoleProvider>,
    );

    expect(mockedFileFullscreenModal).toHaveBeenCalledWith(
      expect.objectContaining({isDownloadRestricted: true}),
      expect.anything(),
    );
  });

  it('allows download when viewer permissions are disabled', () => {
    jest.spyOn(RootProvider, 'useApplicationContext').mockReturnValue({
      isFeatureToggleEnabled: jest.fn(() => false),
    } as unknown as RootProvider.RootContextValue);

    render(
      <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.VIEWER}>
        <FilePreviewModal {...defaultProps} />
      </CellsSelfUserDriveRoleProvider>,
    );

    expect(mockedFileFullscreenModal).toHaveBeenCalledWith(
      expect.objectContaining({isDownloadRestricted: false}),
      expect.anything(),
    );
  });
});
