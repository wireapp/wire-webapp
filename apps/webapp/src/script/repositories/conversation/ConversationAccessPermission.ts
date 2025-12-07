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

import {CONVERSATION_ACCESS_ROLE, CONVERSATION_ACCESS} from '@wireapp/api-client/lib/conversation/';
import {combinePermissions, hasPermissions} from 'Repositories/user/UserPermission';

import {ACCESS_STATE, TEAM} from './AccessState';

export const ACCESS_TYPES = {
  GUEST: 1 << 0,
  NON_TEAM_MEMBER: 1 << 1,
  TEAM_MEMBER: 1 << 2,
  SERVICE: 1 << 3,
};

export const ACCESS_MODES = {
  INVITE: 1 << 4,
  CODE: 1 << 5,
  LINK: 1 << 6,
};

const ACCESS = {...ACCESS_TYPES, ...ACCESS_MODES};

export function teamPermissionsForAccessState(state: ACCESS_STATE): number {
  switch (state) {
    case ACCESS_STATE.TEAM.GUESTS_SERVICES: {
      return combinePermissions([teamPermissionsForAccessState(ACCESS_STATE.TEAM.GUEST_ROOM), ACCESS_TYPES.SERVICE]);
    }
    case ACCESS_STATE.TEAM.PUBLIC: {
      return combinePermissions([teamPermissionsForAccessState(ACCESS_STATE.TEAM.TEAM_ONLY), ACCESS_MODES.LINK]);
    }
    case ACCESS_STATE.TEAM.PUBLIC_GUESTS: {
      return combinePermissions([teamPermissionsForAccessState(ACCESS_STATE.TEAM.GUEST_ROOM), ACCESS_MODES.LINK]);
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

export function featureFromStateChange(prevState: ACCESS_STATE, current: ACCESS_STATE) {
  if (prevState === current) {
    return {feature: undefined, featureName: undefined, isAvailable: undefined, bitmask: 0};
  }
  const [featureName, featureBitmask] = Object.entries(ACCESS).find(
    ([, bitmask]) => bitmask & (teamPermissionsForAccessState(prevState) ^ teamPermissionsForAccessState(current)),
  );
  const featString = CONVERSATION_ACCESS_ROLE[featureName as keyof typeof CONVERSATION_ACCESS_ROLE];
  return {
    feature: featString,
    featureName: (featString?.[0].toUpperCase() + featString?.slice(1)) as 'Guest' | 'Service',
    isAvailable: hasAccessToFeature(featureBitmask, current),
    bitmask: featureBitmask,
  };
}

/** AccessStates sorted by permissions. most first */
const AccessStatesByPerm = [
  ACCESS_STATE.TEAM.GUESTS_SERVICES,
  ACCESS_STATE.TEAM.PUBLIC_GUESTS,
  ACCESS_STATE.TEAM.GUEST_ROOM,
  ACCESS_STATE.TEAM.PUBLIC,
  ACCESS_STATE.TEAM.SERVICES,
  ACCESS_STATE.TEAM.TEAM_ONLY,
  ACCESS_STATE.TEAM.ONE2ONE,
  ACCESS_STATE.TEAM.LEGACY,
];

export function accessFromPermissions(permissions: number): TEAM {
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

export function toggleFeature(feature: number, state: ACCESS_STATE): TEAM {
  let permissions = teamPermissionsForAccessState(state);
  return accessFromPermissions((permissions ^= feature));
}

export interface UpdatedAccessRights {
  accessModes: CONVERSATION_ACCESS[];
  accessRole: CONVERSATION_ACCESS_ROLE[];
}

/**
 * This function returns arrays of the names of the new features to be turned on in the backend for each change in access state.
 * @param accessState the new access state
 * @returns {UpdatedAccessRights} UpdatedAccessRights
 */
export function updateAccessRights(accessState: ACCESS_STATE): UpdatedAccessRights {
  const newAccessRights: UpdatedAccessRights = {accessModes: [], accessRole: []};

  teamPermissionsForAccessState(accessState)
    //turn the permissions into a bitwise value ie. 11011
    .toString(2)
    .split('')
    //reverse so that the index reflects the number of significant figures for finding the feature
    .reverse()
    //find the name of the feature with the correct sigfigs
    .map((bit: '1' | '0', i) => Object.entries(ACCESS).find(([, bitmask]) => bitmask === +bit << i)?.[0])
    .forEach(feature => {
      const accessRole = CONVERSATION_ACCESS_ROLE[feature as keyof typeof CONVERSATION_ACCESS_ROLE];
      const accessModes = CONVERSATION_ACCESS[feature as keyof typeof CONVERSATION_ACCESS];
      if (accessRole) {
        newAccessRights.accessRole.push(accessRole);
      } else if (accessModes) {
        newAccessRights.accessModes.push(accessModes);
      }
    });

  return newAccessRights;
}
