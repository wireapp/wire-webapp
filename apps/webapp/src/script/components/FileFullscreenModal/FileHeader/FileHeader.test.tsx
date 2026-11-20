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

import {fireEvent, render, screen, waitFor, type RenderResult} from '@testing-library/react';
import {container} from 'tsyringe';

import {
  CELLS_SELF_USER_DRIVE_ROLE,
  CellsSelfUserDriveRoleProvider,
} from '../../conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {CellsRepository} from '../../../repositories/cells/cellsRepository';
import {withThemeAndRootContext} from '../../../auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../page/testSupport/rootContextTestSupport';

import * as util from '../../../util/util';
import {FileHeader, getConversationIconType} from './FileHeader';
import type {CellsSelfUserDriveRole} from '../../conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import type {ReactNode} from 'react';

const translate = (key: string): string => {
  return (
    {
      'cells.imageFullScreenModal.closeButton': 'Close',
      'cells.imageFullScreenModal.downloadButton': 'Download',
      'cells.imageFullScreenModal.viewerAccessLabel': 'Viewer access',
      'cells.options.label': 'More options',
      'cells.options.versionHistory': 'Version History',
    }[key] ?? key
  );
};

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

type CreateWrapperResult = (properties: {readonly children: ReactNode}) => ReactNode;
const createWrapper = (): CreateWrapperResult => {
  return createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate,
    }),
  );
};

describe('FileHeader', () => {
  beforeEach(() => {
    container.registerInstance(CellsRepository, {} as CellsRepository);
  });

  afterEach(() => {
    container.reset();
  });

  const renderHeader = ({
    props = {},
    selfUserDriveRole = CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
  }: {
    props?: Partial<Parameters<typeof FileHeader>[0]>;
    selfUserDriveRole?: CellsSelfUserDriveRole;
  } = {}): RenderResult => {
    return render(
      withThemeAndRootContext(
        <CellsSelfUserDriveRoleProvider selfUserDriveRole={selfUserDriveRole}>
          <FileHeader {...defaultProps} {...props} />
        </CellsSelfUserDriveRoleProvider>,
        createWrapper(),
      ),
    );
  };

  it('hides download action when download is restricted', () => {
    renderHeader();

    expect(screen.queryByRole('button', {name: 'Download'})).not.toBeInTheDocument();
  });

  it('preserves the default Cells download path and resolves the latest pre-signed URL', async () => {
    container.reset();
    const signedUrl = 'https://cells.example.com/signed-document.pdf';
    const getNode = jest.fn().mockResolvedValue({PreSignedGET: {Url: signedUrl}});
    container.registerInstance(CellsRepository, {getNode} as unknown as CellsRepository);
    const forceDownload = jest.spyOn(util, 'forcedDownloadFile').mockResolvedValue(undefined);
    renderHeader({selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.EDITOR});

    fireEvent.click(screen.getByRole('button', {name: 'Download'}));

    await waitFor(() => {
      expect(forceDownload).toHaveBeenCalledWith({url: signedUrl, name: 'document.pdf'});
    });
    expect(getNode).toHaveBeenCalledWith({uuid: 'file-id'});
  });

  it('uses the chat download callback without resolving Cells services or permissions', async () => {
    container.reset();
    const onDownload = jest.fn().mockResolvedValue(undefined);
    renderHeader({props: {context: 'chat', onDownload, fileUrl: undefined, isEditable: true}});

    const downloadButton = screen.getByRole('button', {name: 'Download'});
    expect(downloadButton).toBeEnabled();
    expect(screen.queryByRole('button', {name: 'Editing'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'More options'})).not.toBeInTheDocument();
    expect(screen.queryByText('Viewer access')).not.toBeInTheDocument();

    fireEvent.click(downloadButton);
    await waitFor(() => {
      expect(onDownload).toHaveBeenCalledTimes(1);
    });
  });

  it('focuses the close action when a chat preview opens', () => {
    renderHeader({props: {context: 'chat', autoFocusCloseButton: true}});

    expect(screen.getByRole('button', {name: 'Close'})).toHaveFocus();
  });

  it('hides edit and version history actions for restricted viewers on editable files', () => {
    renderHeader({
      props: {
        isEditable: true,
      },
    });

    expect(screen.queryByRole('button', {name: 'Editing'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'More options'})).not.toBeInTheDocument();
  });

  it('shows file metadata beside the file name', () => {
    const {container: renderContainer} = renderHeader({
      props: {
        fallbackConversationName: 'Marketing Channel',
        senderName: 'Kim Dawson',
      },
    });

    expect(screen.getByRole('heading', {name: 'document'})).toBeInTheDocument();
    expect(screen.getByText('Marketing Channel')).toBeInTheDocument();
    expect(screen.getByText('Kim Dawson')).toBeInTheDocument();
    expect(renderContainer.querySelector('[data-uie-name="group-avatar-box-wrapper"]')).toBeInTheDocument();
  });

  it.each([
    {isChannel: false, isChannelsEnabled: true, expectedIconType: 'group'},
    {isChannel: true, isChannelsEnabled: false, expectedIconType: 'group'},
    {isChannel: true, isChannelsEnabled: true, expectedIconType: 'channel'},
  ])(
    'returns $expectedIconType icon when isChannel is $isChannel and isChannelsEnabled is $isChannelsEnabled',
    ({isChannel, isChannelsEnabled, expectedIconType}) => {
      expect(getConversationIconType({isChannel, isChannelsEnabled})).toBe(expectedIconType);
    },
  );

  it('shows viewer access state and removes other action buttons', () => {
    const {container: renderContainer} = renderHeader({
      props: {isEditable: true, showViewOnlyLabel: true},
    });

    expect(screen.getByText('Viewer access')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Download'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Viewing'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Editing'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'More options'})).not.toBeInTheDocument();
    expect(renderContainer.querySelector('[data-uie-name="file-header-view-only-icon"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
