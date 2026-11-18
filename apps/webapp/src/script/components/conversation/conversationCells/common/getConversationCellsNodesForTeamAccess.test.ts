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
 */

import {Maybe} from 'true-myth';

import {
  CELLS_ACTION,
  CELLS_SELF_USER_DRIVE_ROLE,
  canPerformCellsAction,
} from './cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {getConversationCellsNodesForTeamAccess} from './getConversationCellsNodesForTeamAccess';

import {CellNode, CellNodeType} from '../../../../types/cellNode';

const editorNode: CellNode = {
  id: 'file-id',
  path: 'report.pdf',
  name: 'report.pdf',
  sizeMb: '1 MB',
  sizeBytes: Maybe.just(1024),
  uploadedAtTimestamp: 1,
  owner: 'Owner',
  conversationName: 'Conversation',
  tags: [],
  presignedUrlExpiresAt: null,
  user: null,
  selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.EDITOR,
  extension: 'pdf',
  type: CellNodeType.FILE,
};

describe('getConversationCellsNodesForTeamAccess', () => {
  it('shows existing files while removing editor actions when team Cells is disabled', () => {
    const [visibleNode] = getConversationCellsNodesForTeamAccess([editorNode], true);

    expect(visibleNode).toMatchObject({id: editorNode.id, name: editorNode.name});
    expect(visibleNode.selfUserDriveRole).toBe(CELLS_SELF_USER_DRIVE_ROLE.VIEWER);
    expect(canPerformCellsAction({action: CELLS_ACTION.RENAME, selfUserDriveRole: visibleNode.selfUserDriveRole})).toBe(
      false,
    );
    expect(editorNode.selfUserDriveRole).toBe(CELLS_SELF_USER_DRIVE_ROLE.EDITOR);
  });

  it('preserves the original node access when team Cells is enabled', () => {
    expect(getConversationCellsNodesForTeamAccess([editorNode], false)[0]).toBe(editorNode);
  });
});
