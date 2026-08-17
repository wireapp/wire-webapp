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

import {createContext, type ReactNode, useCallback, useContext} from 'react';

import {viewerPermissionFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';

export const CELLS_SELF_USER_DRIVE_ROLE = {
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

export type CellsSelfUserDriveRole = (typeof CELLS_SELF_USER_DRIVE_ROLE)[keyof typeof CELLS_SELF_USER_DRIVE_ROLE];

interface GetSelfUserDriveRoleParams {
  conversationTeamId?: string;
  selfUserTeamId?: string;
}

export const getSelfUserDriveRole = ({
  conversationTeamId,
  selfUserTeamId,
}: GetSelfUserDriveRoleParams): CellsSelfUserDriveRole => {
  if (!conversationTeamId) {
    return CELLS_SELF_USER_DRIVE_ROLE.EDITOR;
  }

  if (!selfUserTeamId) {
    return CELLS_SELF_USER_DRIVE_ROLE.VIEWER;
  }

  return conversationTeamId === selfUserTeamId ? CELLS_SELF_USER_DRIVE_ROLE.EDITOR : CELLS_SELF_USER_DRIVE_ROLE.VIEWER;
};

interface ShouldRestrictCellsViewerActionsParams {
  isViewerPermissionFeatureEnabled: boolean;
  selfUserDriveRole: CellsSelfUserDriveRole;
}

export const shouldRestrictCellsViewerActions = ({
  isViewerPermissionFeatureEnabled,
  selfUserDriveRole,
}: ShouldRestrictCellsViewerActionsParams): boolean => {
  return isViewerPermissionFeatureEnabled && selfUserDriveRole === CELLS_SELF_USER_DRIVE_ROLE.VIEWER;
};

export const CELLS_ACTION = {
  CREATE: 'create',
  DELETE: 'delete',
  DOWNLOAD: 'download',
  EDIT: 'edit',
  MOVE: 'move',
  RENAME: 'rename',
  RESTORE: 'restore',
  SHARE: 'share',
  TAGS: 'tags',
  VIEW_VERSION_HISTORY: 'viewVersionHistory',
} as const;

export type CellsAction = (typeof CELLS_ACTION)[keyof typeof CELLS_ACTION];

const RESTRICTED_VIEWER_ACTIONS: readonly CellsAction[] = [
  CELLS_ACTION.CREATE,
  CELLS_ACTION.DELETE,
  CELLS_ACTION.DOWNLOAD,
  CELLS_ACTION.EDIT,
  CELLS_ACTION.MOVE,
  CELLS_ACTION.RENAME,
  CELLS_ACTION.RESTORE,
  CELLS_ACTION.SHARE,
  CELLS_ACTION.TAGS,
  CELLS_ACTION.VIEW_VERSION_HISTORY,
];

interface CanPerformCellsActionParams {
  action: CellsAction;
  isViewerPermissionFeatureEnabled: boolean;
  selfUserDriveRole: CellsSelfUserDriveRole;
}

export const canPerformCellsAction = ({
  action,
  isViewerPermissionFeatureEnabled,
  selfUserDriveRole,
}: CanPerformCellsActionParams): boolean => {
  if (!shouldRestrictCellsViewerActions({isViewerPermissionFeatureEnabled, selfUserDriveRole})) {
    return true;
  }

  // Viewer restrictions are being rolled out incrementally, so actions stay allowed until explicitly restricted.
  return !RESTRICTED_VIEWER_ACTIONS.includes(action);
};

const CellsSelfUserDriveRoleContext = createContext<CellsSelfUserDriveRole>(CELLS_SELF_USER_DRIVE_ROLE.EDITOR);

interface CellsSelfUserDriveRoleProviderProps {
  children: ReactNode;
  selfUserDriveRole: CellsSelfUserDriveRole;
}

export const CellsSelfUserDriveRoleProvider = ({children, selfUserDriveRole}: CellsSelfUserDriveRoleProviderProps) => {
  return (
    <CellsSelfUserDriveRoleContext.Provider value={selfUserDriveRole}>
      {children}
    </CellsSelfUserDriveRoleContext.Provider>
  );
};

export const useCellsSelfUserDriveRole = (): CellsSelfUserDriveRole => {
  return useContext(CellsSelfUserDriveRoleContext);
};

export const useCellsActionPermissions = () => {
  const {isFeatureToggleEnabled} = useApplicationContext();
  const selfUserDriveRole = useCellsSelfUserDriveRole();
  const isViewerPermissionFeatureEnabled = isFeatureToggleEnabled(viewerPermissionFeatureToggleName);

  return useCallback(
    (action: CellsAction) =>
      canPerformCellsAction({
        action,
        isViewerPermissionFeatureEnabled,
        selfUserDriveRole,
      }),
    [isViewerPermissionFeatureEnabled, selfUserDriveRole],
  );
};
