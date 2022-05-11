/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {combinePermissions, hasPermissions} from '../user/UserPermission';
import {ACCESS_STATE} from './AccessState';

export const ACCESS_TYPES = {
  GUEST: 1 << 0,
  NON_TEAM_MEMBER: 1 << 1,
  SERVICE: 1 << 3,
  TEAM_MEMBER: 1 << 2,
};

export const ACCESS_MODES = {
  CODE: 1 << 5,
  INVITE: 1 << 4,
};

export function teamPermissionsForAccessState(state: ACCESS_STATE): number {
  switch (state) {
    case ACCESS_STATE.TEAM.GUESTS_SERVICES: {
      return combinePermissions([teamPermissionsForAccessState(ACCESS_STATE.TEAM.GUEST_ROOM), ACCESS_TYPES.SERVICE]);
    }
    case ACCESS_STATE.TEAM.GUEST_ROOM: {
      return combinePermissions([
        teamPermissionsForAccessState(ACCESS_STATE.TEAM.TEAM_ONLY),
        teamPermissionsForAccessState(ACCESS_STATE.TEAM.GUEST_FEATURES),
      ]);
    }
    case ACCESS_STATE.TEAM.GUEST_FEATURES: {
      return combinePermissions([ACCESS_TYPES.GUEST, ACCESS_MODES.CODE, ACCESS_TYPES.NON_TEAM_MEMBER]);
    }
    case ACCESS_STATE.TEAM.SERVICES: {
      return combinePermissions([teamPermissionsForAccessState(ACCESS_STATE.TEAM.TEAM_ONLY), ACCESS_TYPES.SERVICE]);
    }
    case ACCESS_STATE.TEAM.TEAM_ONLY: {
      return combinePermissions([ACCESS_MODES.INVITE, ACCESS_TYPES.TEAM_MEMBER]);
    }
    default: {
      return 0;
    }
  }
}

export function hasAccessToFeature(feature: number, state: ACCESS_STATE): boolean {
  const permissions = teamPermissionsForAccessState(state);
  return !!(feature & permissions);
}

export function isGettingAccessToFeature(feature: number, prevState: ACCESS_STATE, current: ACCESS_STATE) {
  return !hasAccessToFeature(feature, prevState) && hasAccessToFeature(feature, current);
}

/** AccessStates sorted by permissions. most first */
const AccessStatesByPerm = [
  ACCESS_STATE.TEAM.GUESTS_SERVICES,
  ACCESS_STATE.TEAM.GUEST_ROOM,
  ACCESS_STATE.TEAM.SERVICES,
  ACCESS_STATE.TEAM.TEAM_ONLY,
  ACCESS_STATE.TEAM.ONE2ONE,
  ACCESS_STATE.TEAM.LEGACY,
];

export function accessFromPermissions(permissions: number): ACCESS_STATE {
  const invalidRoles = [ACCESS_STATE.TEAM.LEGACY, ACCESS_STATE.TEAM.ONE2ONE];
  const detectedRole = AccessStatesByPerm.filter(role => !invalidRoles.includes(role)).find(role =>
    hasPermissionForRole(permissions, role),
  );
  return detectedRole || ACCESS_STATE.TEAM.LEGACY;
}

function hasPermissionForRole(memberPermissions: number, state: ACCESS_STATE): boolean {
  const rolePermissions = teamPermissionsForAccessState(state);
  return hasPermissions(memberPermissions, rolePermissions);
}

export function toggleFeature(feature: number, state: ACCESS_STATE): ACCESS_STATE {
  let permissions = teamPermissionsForAccessState(state);
  return accessFromPermissions((permissions ^= feature));
}
