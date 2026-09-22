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

import {ReactNode} from 'react';

import {act, render, screen} from '@testing-library/react';
import {container} from 'tsyringe';

import {CELLS_SELF_USER_DRIVE_ROLE} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {viewerPermissionFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createExecutingFireAndForgetInvokerForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {CellFile, CellNodeType} from 'src/script/types/cellNode';

import {CellsFilePreviewModal} from './cellsFilePreviewModal';
import {
  CellsFilePreviewModalContext,
  CellsFilePreviewModalContextValue,
} from '../common/cellsFilePreviewModalContext/cellsFilePreviewModalContext';

const translate = (key: string) =>
  ({
    'cells.imageFullScreenModal.closeButton': 'Close',
    'cells.imageFullScreenModal.downloadButton': 'Download',
    'cells.options.label': 'More options',
    'cells.options.versionHistory': 'Version History',
    'fileFullscreenModal.editor.iframeTitle': 'Collabora editor',
  })[key] ?? key;

const createRootProviderWrapper = ({
  fireAndForgetInvoker,
  isViewerPermissionFeatureEnabled,
}: {
  fireAndForgetInvoker: ReturnType<typeof createExecutingFireAndForgetInvokerForTest>;
  isViewerPermissionFeatureEnabled: boolean;
}) =>
  createRootProviderWrapperForTest(
    createRootContextValueForTest({
      fireAndForgetInvoker,
      isFeatureToggleEnabled: featureName =>
        featureName === viewerPermissionFeatureToggleName && isViewerPermissionFeatureEnabled,
      translate,
    }),
  );

const file: CellFile = {
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

const FakeFilePreviewProvider = ({
  children,
  selfUserDriveRole,
  selectedFile = file,
}: {
  children: ReactNode;
  selfUserDriveRole: CellFile['selfUserDriveRole'];
  selectedFile?: CellFile;
}) => {
  const value: CellsFilePreviewModalContextValue = {
    id: 'preview-context-id',
    selectedFile: {...selectedFile, selfUserDriveRole},
    isEditMode: true,
    handleOpenFile: jest.fn(),
    handleCloseFile: jest.fn(),
  };

  return <CellsFilePreviewModalContext.Provider value={value}>{children}</CellsFilePreviewModalContext.Provider>;
};

describe('CellsFilePreviewModal', () => {
  beforeEach(() => {
    container.registerInstance(CellsRepository, {
      getNode: jest.fn().mockResolvedValue({
        EditorURLs: {
          collabora: {
            ExpiresAt: '1000',
            Url: 'https://cells.example.com/editor?token=abc',
          },
        },
        IsRecycled: false,
      }),
    } as unknown as CellsRepository);
  });

  afterEach(() => {
    container.reset();
  });

  const renderModal = ({
    isViewerPermissionFeatureEnabled = true,
    selfUserDriveRole,
    selectedFile,
  }: {
    isViewerPermissionFeatureEnabled?: boolean;
    selfUserDriveRole: CellFile['selfUserDriveRole'];
    selectedFile?: CellFile;
  }) => {
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();

    render(
      withThemeAndRootContext(
        <FakeFilePreviewProvider selfUserDriveRole={selfUserDriveRole} selectedFile={selectedFile}>
          <CellsFilePreviewModal />
        </FakeFilePreviewProvider>,
        createRootProviderWrapper({fireAndForgetInvoker, isViewerPermissionFeatureEnabled}),
      ),
    );

    return {fireAndForgetInvoker};
  };

  it('uses the global drive file role when rendering fullscreen actions', async () => {
    renderModal({selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER});

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Download'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Editing'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'More options'})).not.toBeInTheDocument();
    expect(screen.queryByTitle('Collabora editor')).not.toBeInTheDocument();
  });

  it('keeps fullscreen modification actions available for editors', async () => {
    const {fireAndForgetInvoker} = renderModal({selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.EDITOR});

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Download'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Editing'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'More options'})).toBeInTheDocument();
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());
    expect(screen.getByTitle('Collabora editor')).toBeInTheDocument();
  });
});
