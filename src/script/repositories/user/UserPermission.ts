/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {Role} from '@wireapp/api-client/lib/team';
import type {PermissionsData} from '@wireapp/api-client/lib/team/member/PermissionsData';

import {capitalizeFirstChar} from 'Util/StringUtil';

import {TeamError} from '../../error/TeamError';

/**
 * Enum for various team permissions.
 */
const TEAM_FEATURES = {
  NONE: 0,
  CREATE_CONVERSATION: 1 << 0,
  DELETE_CONVERSATION: 1 << 1,
  ADD_TEAM_MEMBER: 1 << 2,
  REMOVE_TEAM_MEMBER: 1 << 3,
  ADD_CONVERSATION_MEMBER: 1 << 4,
  REMOVE_CONVERSATION_MEMBER: 1 << 5,
  GET_BILLING: 1 << 6,
  SET_BILLING: 1 << 7,
  SET_TEAM_DATA: 1 << 8,
  GET_MEMBER_PERMISSIONS: 1 << 9,
  GET_TEAM_CONVERSATIONS: 1 << 10,
  DELETE_TEAM: 1 << 11,
  SET_MEMBER_PERMISSIONS: 1 << 12,
};

/*
 * While the values for team features are set by the backend,
 * the public features are set by the webapp.
 * To avoid duplications, the values for the public features
 * need to be higher than the values for team features.
 * Additionally, we also don't want to change them manually
 * every time there is a new team feature.
 */
let bitsCounter = Object.keys(TEAM_FEATURES).length - 1;

const PUBLIC_FEATURES = {
  CHAT_WITH_SERVICES: 1 << bitsCounter++,
  CREATE_GROUP_CONVERSATION: 1 << bitsCounter++,
  CREATE_GUEST_ROOM: 1 << bitsCounter++,
  INVITE_TEAM_MEMBERS: 1 << bitsCounter++,
  MANAGE_SERVICES: 1 << bitsCounter++,
  MANAGE_TEAM: 1 << bitsCounter++,
  SEARCH_UNCONNECTED_USERS: 1 << bitsCounter++,
  UPDATE_CONVERSATION_SETTINGS: 1 << bitsCounter++,
  UPDATE_GROUP_PARTICIPANTS: 1 << bitsCounter++,
};

export const FEATURES = {...TEAM_FEATURES, ...PUBLIC_FEATURES};

function teamPermissionsForRole(teamRole: ROLE): number {
  switch (teamRole) {
    case ROLE.OWNER: {
      return combinePermissions([
        teamPermissionsForRole(ROLE.ADMIN),
        TEAM_FEATURES.DELETE_TEAM,
        TEAM_FEATURES.GET_BILLING,
        TEAM_FEATURES.SET_BILLING,
      ]);
    }
    case ROLE.ADMIN: {
      return combinePermissions([
        teamPermissionsForRole(ROLE.MEMBER),
        TEAM_FEATURES.ADD_TEAM_MEMBER,
        TEAM_FEATURES.REMOVE_TEAM_MEMBER,
        TEAM_FEATURES.SET_MEMBER_PERMISSIONS,
        TEAM_FEATURES.SET_TEAM_DATA,
      ]);
    }
    case ROLE.MEMBER: {
      return combinePermissions([
        teamPermissionsForRole(ROLE.PARTNER),
        TEAM_FEATURES.ADD_CONVERSATION_MEMBER,
        TEAM_FEATURES.DELETE_CONVERSATION,
        TEAM_FEATURES.GET_MEMBER_PERMISSIONS,
        TEAM_FEATURES.REMOVE_CONVERSATION_MEMBER,
      ]);
    }
    case ROLE.PARTNER: {
      return combinePermissions([TEAM_FEATURES.CREATE_CONVERSATION, TEAM_FEATURES.GET_TEAM_CONVERSATIONS]);
    }
    default: {
      return 0;
    }
  }
}

function publicPermissionsForRole(role: ROLE): number {
  switch (role) {
    case ROLE.OWNER:
      return combinePermissions([publicPermissionsForRole(ROLE.ADMIN), PUBLIC_FEATURES.INVITE_TEAM_MEMBERS]);
    case ROLE.ADMIN:
      return combinePermissions([
        publicPermissionsForRole(ROLE.MEMBER),
        PUBLIC_FEATURES.MANAGE_SERVICES,
        PUBLIC_FEATURES.MANAGE_TEAM,
      ]);
    case ROLE.MEMBER:
      return combinePermissions([
        publicPermissionsForRole(ROLE.NONE),
        PUBLIC_FEATURES.CREATE_GROUP_CONVERSATION,
        PUBLIC_FEATURES.CREATE_GUEST_ROOM,
      ]);
    case ROLE.NONE:
      return combinePermissions([
        PUBLIC_FEATURES.CREATE_GROUP_CONVERSATION,
        PUBLIC_FEATURES.UPDATE_CONVERSATION_SETTINGS,
        PUBLIC_FEATURES.UPDATE_GROUP_PARTICIPANTS,
        PUBLIC_FEATURES.CHAT_WITH_SERVICES,
        PUBLIC_FEATURES.SEARCH_UNCONNECTED_USERS,
      ]);
    case ROLE.PARTNER:
      return 0;
    default:
      return 0;
  }
}

/** Enum describing all the roles of a team member */
export enum ROLE {
  ADMIN = 'z.team.TeamRole.ROLE.ADMIN',
  INVALID = 'z.team.TeamRole.ROLE.INVALID',
  MEMBER = 'z.team.TeamRole.ROLE.MEMBER',
  NONE = 'z.team.TeamRole.ROLE.NONE',
  OWNER = 'z.team.TeamRole.ROLE.OWNER',
  PARTNER = 'z.team.TeamRole.ROLE.PARTNER',
}

/** Map of roles from the API to the frontend */
export const roleMap: {[key in ROLE]?: Role} = {
  [ROLE.ADMIN]: Role.ADMIN,
  [ROLE.MEMBER]: Role.MEMBER,
  [ROLE.NONE]: Role.NONE,
  [ROLE.OWNER]: Role.OWNER,
  [ROLE.PARTNER]: Role.EXTERNAL,
};

/** Roles sorted by priority, highest first. */
const RolesByPriority = [ROLE.OWNER, ROLE.ADMIN, ROLE.MEMBER, ROLE.PARTNER, ROLE.NONE, ROLE.INVALID];

export function roleFromTeamPermissions(permissions: PermissionsData): ROLE {
  if (!permissions) {
    throw new TeamError(TeamError.TYPE.NO_PERMISSIONS, TeamError.MESSAGE.NO_PERMISSIONS);
  }

  const invalidRoles = [ROLE.INVALID, ROLE.NONE];
  const detectedRole = RolesByPriority.filter(role => !invalidRoles.includes(role)).find(role =>
    hasPermissionForRole(permissions.self, role),
  );

  return detectedRole || ROLE.INVALID;
}

/**
 * Will generate a bunch of helper functions that can be consumed to know what features this role has access to.
 * The function generated will have the following format:
 *   `can<camel cased feature name>: () => boolean`
 *
 * @param boundRole Default role that will be used by default in every helper. Can be overridden by passing a role when calling the helper
 * @returns helpers
 */
export function generatePermissionHelpers(boundRole = ROLE.NONE): Record<string, (role?: ROLE) => boolean> {
  return Object.entries(FEATURES).reduce<Record<string, (role: ROLE) => boolean>>(
    (helpers, [featureKey, featureValue]: [string, number]) => {
      const camelCasedFeature = featureKey.toLowerCase().split('_').map(capitalizeFirstChar).join('');
      helpers[`can${camelCasedFeature}`] = (role = boundRole) => hasAccessToFeature(featureValue, role);
      return helpers;
    },
    {},
  );
}

export function hasAccessToFeature(feature: number, role: ROLE): boolean {
  const permissions = combinePermissions([teamPermissionsForRole(role), publicPermissionsForRole(role)]);
  return !!(feature & permissions);
}

export function combinePermissions(permissions: number[]): number {
  return permissions.reduce((acc, permission) => acc | permission, 0);
}

export function hasPermissions(memberPermissions: number, expectedPermissions: number): boolean {
  return Number.isSafeInteger(memberPermissions) && (memberPermissions & expectedPermissions) === expectedPermissions;
}

function hasPermissionForRole(memberPermissions: number, role: ROLE): boolean {
  const rolePermissions = teamPermissionsForRole(role);
  return hasPermissions(memberPermissions, rolePermissions);
}
