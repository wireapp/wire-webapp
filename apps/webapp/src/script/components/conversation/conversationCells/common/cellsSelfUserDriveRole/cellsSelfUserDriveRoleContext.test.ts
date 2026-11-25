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
  canPerformCellsAction,
  CELLS_ACTION,
  CELLS_SELF_USER_DRIVE_ROLE,
  getSelfUserDriveRole,
  shouldRestrictCellsViewerActions,
} from './cellsSelfUserDriveRoleContext';

describe('getSelfUserDriveRole', () => {
  it('returns editor when conversation and self user are in the same team', () => {
    expect(getSelfUserDriveRole({conversationTeamId: 'team-a', selfUserTeamId: 'team-a'})).toBe(
      CELLS_SELF_USER_DRIVE_ROLE.EDITOR,
    );
  });

  it('returns viewer when conversation and self user are in different teams', () => {
    expect(getSelfUserDriveRole({conversationTeamId: 'team-a', selfUserTeamId: 'team-b'})).toBe(
      CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
    );
  });

  it('defaults to editor when the conversation has no owning team', () => {
    expect(getSelfUserDriveRole({conversationTeamId: undefined, selfUserTeamId: 'team-a'})).toBe(
      CELLS_SELF_USER_DRIVE_ROLE.EDITOR,
    );
  });

  it('returns viewer when a team-owned conversation is accessed by a user without a team', () => {
    expect(getSelfUserDriveRole({conversationTeamId: 'team-a', selfUserTeamId: undefined})).toBe(
      CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
    );
  });
});

describe('shouldRestrictCellsViewerActions', () => {
  it('returns true for viewer access', () => {
    expect(
      shouldRestrictCellsViewerActions({
        selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
      }),
    ).toBe(true);
  });

  it('returns false for editor access', () => {
    expect(
      shouldRestrictCellsViewerActions({
        selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.EDITOR,
      }),
    ).toBe(false);
  });
});

describe('canPerformCellsAction', () => {
  it('blocks version history for viewer access', () => {
    expect(
      canPerformCellsAction({
        action: CELLS_ACTION.VIEW_VERSION_HISTORY,
        selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
      }),
    ).toBe(false);
  });

  it('blocks restricted actions for viewer access', () => {
    expect(
      canPerformCellsAction({
        action: CELLS_ACTION.RESTORE,
        selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
      }),
    ).toBe(false);
  });
});
