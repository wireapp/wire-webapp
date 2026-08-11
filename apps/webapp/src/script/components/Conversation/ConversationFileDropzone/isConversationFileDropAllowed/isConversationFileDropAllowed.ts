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

import {
  CELLS_SELF_USER_DRIVE_ROLE,
  getSelfUserDriveRole,
} from '../../ConversationCells/common/CellsSelfUserDriveRole/CellsSelfUserDriveRoleContext';

interface IsConversationFileDropAllowedParams {
  conversationTeamId?: string;
  selfUserTeamId?: string;
  isCellsEnabled: boolean;
  isViewerPermissionFeatureEnabled: boolean;
}

export const isConversationFileDropAllowed = ({
  conversationTeamId,
  selfUserTeamId,
  isCellsEnabled,
  isViewerPermissionFeatureEnabled,
}: IsConversationFileDropAllowedParams): boolean => {
  if (!isCellsEnabled || !isViewerPermissionFeatureEnabled) {
    return true;
  }

  return getSelfUserDriveRole({conversationTeamId, selfUserTeamId}) === CELLS_SELF_USER_DRIVE_ROLE.EDITOR;
};
