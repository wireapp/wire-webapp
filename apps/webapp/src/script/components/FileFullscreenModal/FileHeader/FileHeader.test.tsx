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

import {FileHeader, getConversationIconType} from './FileHeader';

const translate = (key: string) =>
  ({
    'cells.imageFullScreenModal.closeButton': 'Close',
    'cells.imageFullScreenModal.downloadButton': 'Download',
    'cells.imageFullScreenModal.viewerAccessLabel': 'Viewer access',
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

const createWrapper = (isViewerPermissionFeatureEnabled: boolean) =>
  createRootProviderWrapperForTest(
    createRootContextValueForTest({
      isFeatureToggleEnabled: () => isViewerPermissionFeatureEnabled,
      translate,
    }),
  );

describe('FileHeader', () => {
  beforeEach(() => {
    container.registerInstance(CellsRepository, {} as CellsRepository);
  });

  afterEach(() => {
    container.reset();
  });

  const renderHeader = ({
    isViewerPermissionFeatureEnabled = false,
    props = {},
  }: {
    isViewerPermissionFeatureEnabled?: boolean;
    props?: Partial<Parameters<typeof FileHeader>[0]>;
  } = {}) =>
    render(
      withThemeAndRootContext(
        <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.VIEWER}>
          <FileHeader {...defaultProps} {...props} />
        </CellsSelfUserDriveRoleProvider>,
        createWrapper(isViewerPermissionFeatureEnabled),
      ),
    );

  it('hides download action when download is restricted', () => {
    renderHeader({isViewerPermissionFeatureEnabled: true});

    expect(screen.queryByRole('button', {name: 'Download'})).not.toBeInTheDocument();
  });

  it('hides edit and version history actions for restricted viewers on editable files', () => {
    renderHeader({
      isViewerPermissionFeatureEnabled: true,
      props: {
        isEditable: true,
      },
    });

    expect(screen.queryByRole('button', {name: 'Editing'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'More options'})).not.toBeInTheDocument();
  });

  it('shows download action when download is allowed', () => {
    renderHeader({isViewerPermissionFeatureEnabled: false});

    expect(screen.getByRole('button', {name: 'Download'})).toBeInTheDocument();
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
      isViewerPermissionFeatureEnabled: true,
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
