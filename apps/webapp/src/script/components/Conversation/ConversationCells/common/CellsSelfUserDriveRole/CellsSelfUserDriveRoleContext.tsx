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

import {createContext, type ReactNode, useContext} from 'react';

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
  if (!conversationTeamId || !selfUserTeamId) {
    return CELLS_SELF_USER_DRIVE_ROLE.EDITOR;
  }

  return conversationTeamId === selfUserTeamId ? CELLS_SELF_USER_DRIVE_ROLE.EDITOR : CELLS_SELF_USER_DRIVE_ROLE.VIEWER;
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
