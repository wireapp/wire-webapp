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

import {fireEvent, render, screen} from '@testing-library/react';
import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {ConversationFileDownloadPermissionProvider} from 'Components/cells/ConversationFileDownloadPermission/ConversationFileDownloadPermission';
import {
  CELLS_SELF_USER_DRIVE_ROLE,
  CellsSelfUserDriveRoleProvider,
} from 'Components/Conversation/ConversationCells/common/CellsSelfUserDriveRole/CellsSelfUserDriveRoleContext';
import {CellsFilePreviewModalProvider} from 'Components/Conversation/ConversationCells/CellsTable/common/CellsFilePreviewModalContext/CellsFilePreviewModalContext';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {translateForTest} from 'Util/test/translateForTest';

import {CellsTableRowOptions} from './CellsTableRowOptions';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const node: CellNode = {
  id: 'file-id',
  url: 'https://example.com/file.pdf',
  path: '/file.pdf',
  name: 'file.pdf',
  sizeMb: '1 MB',
  extension: 'pdf',
  uploadedAtTimestamp: 1_700_000_000_000,
  owner: 'Alice',
  conversationName: 'Conversation',
  tags: [],
  presignedUrlExpiresAt: null,
  user: null,
  type: CellNodeType.FILE,
  selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.EDITOR,
};

const cellsRepository = {} as CellsRepository;

const renderRowOptions = (isDownloadAllowed: boolean) =>
  render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      {rootProviderWrapper({
        children: (
          <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.EDITOR}>
            <ConversationFileDownloadPermissionProvider isDownloadAllowed={isDownloadAllowed}>
              <CellsFilePreviewModalProvider>
                <CellsTableRowOptions
                  node={node}
                  cellsRepository={cellsRepository}
                  conversationQualifiedId={{id: 'conversation-id', domain: 'example.com'}}
                  conversationName="Conversation"
                  onRefresh={jest.fn()}
                />
              </CellsFilePreviewModalProvider>
            </ConversationFileDownloadPermissionProvider>
          </CellsSelfUserDriveRoleProvider>
        ),
      })}
    </StyledApp>,
  );

describe('CellsTableRowOptions', () => {
  it('hides Download and keeps Open available when downloads are not allowed', () => {
    renderRowOptions(false);

    fireEvent.keyDown(screen.getByLabelText('cells.options.label'), {key: 'Enter'});

    expect(screen.queryByText('cells.options.download')).not.toBeInTheDocument();
    expect(screen.getByText('cells.options.open')).toBeInTheDocument();
  });

  it('shows Download when downloads are allowed', () => {
    renderRowOptions(true);

    fireEvent.keyDown(screen.getByLabelText('cells.options.label'), {key: 'Enter'});

    expect(screen.getByText('cells.options.download')).toBeInTheDocument();
  });
});
