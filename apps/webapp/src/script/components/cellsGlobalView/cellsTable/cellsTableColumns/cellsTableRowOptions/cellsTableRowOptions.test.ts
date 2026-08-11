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

import {CELLS_SELF_USER_DRIVE_ROLE} from 'Components/Conversation/ConversationCells/common/CellsSelfUserDriveRole/CellsSelfUserDriveRoleContext';

import {shouldDisableViewerRestrictedActions} from './cellsTableRowOptions';

describe('shouldDisableViewerRestrictedActions', () => {
  it('returns true for viewer nodes when the feature flag is enabled', () => {
    expect(
      shouldDisableViewerRestrictedActions({
        isViewerPermissionFeatureEnabled: true,
        selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
      }),
    ).toBe(true);
  });

  it('returns false for viewer nodes when the feature flag is disabled', () => {
    expect(
      shouldDisableViewerRestrictedActions({
        isViewerPermissionFeatureEnabled: false,
        selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
      }),
    ).toBe(false);
  });

  it('returns false for editor nodes when the feature flag is enabled', () => {
    expect(
      shouldDisableViewerRestrictedActions({
        isViewerPermissionFeatureEnabled: true,
        selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.EDITOR,
      }),
    ).toBe(false);
  });
});
