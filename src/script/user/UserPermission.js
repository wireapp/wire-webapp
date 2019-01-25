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

import stringUtil from 'utils/StringUtil';

let bitsCounter = 0;

/* eslint-disable sort-keys */
/**
 * Enum for different team permissions.
 */
const TEAM_FEATURES = {
  NONE: 0,
  CREATE_CONVERSATION: 1 << bitsCounter++,
  DELETE_CONVERSATION: 1 << bitsCounter++,
  ADD_TEAM_MEMBER: 1 << bitsCounter++,
  REMOVE_TEAM_MEMBER: 1 << bitsCounter++,
  ADD_CONVERSATION_MEMBER: 1 << bitsCounter++,
  REMOVE_CONVERSATION_MEMBER: 1 << bitsCounter++,
  GET_BILLING: 1 << bitsCounter++,
  SET_BILLING: 1 << bitsCounter++,
  SET_TEAM_DATA: 1 << bitsCounter++,
  GET_MEMBER_PERMISSIONS: 1 << bitsCounter++,
  GET_TEAM_CONVERSATIONS: 1 << bitsCounter++,
  DELETE_TEAM: 1 << bitsCounter++,
  SET_MEMBER_PERMISSIONS: 1 << bitsCounter++,
};

const PUBLIC_FEATURES = {
  CREATE_GROUP_CONVERSATION: 1 << bitsCounter++,
  CREATE_GUEST_ROOM: 1 << bitsCounter++,
  UPDATE_CONVERSATION_SETTINGS: 1 << bitsCounter++,
  UPDATE_GROUP_PARTICIPANTS: 1 << bitsCounter++,
  MANAGE_SERVICES: 1 << bitsCounter++,
  MANAGE_TEAM: 1 << bitsCounter++,
  INVITE_TEAM_MEMBERS: 1 << bitsCounter++,
  CHAT_WITH_SERVICES: 1 << bitsCounter++,
};
/* eslint-enable sort-keys */

export const FEATURES = Object.assign({}, TEAM_FEATURES, PUBLIC_FEATURES);

function teamPermissionsForRole(teamRole) {
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

function publicPermissionsForRole(role) {
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
      ]);
    case ROLE.PARTNER:
      return 0;

    default:
      return 0;
  }
}

/* eslint-disable sort-keys */
/**
 * Object describing all the roles of a team member
 * This object needs to be sorted from the highest priority to the lowest
 */
export const ROLE = {
  OWNER: 'z.team.TeamRole.ROLE.OWNER',
  ADMIN: 'z.team.TeamRole.ROLE.ADMIN',
  MEMBER: 'z.team.TeamRole.ROLE.MEMBER',
  PARTNER: 'z.team.TeamRole.ROLE.PARTNER',
  NONE: 'z.team.TeamRole.ROLE.NONE',
  INVALID: 'z.team.TeamRole.ROLE.INVALID',
};
/* eslint-enable sort-keys */

export function roleFromTeamPermissions(permissions) {
  if (!permissions) {
    throw new z.error.TeamError(z.error.TeamError.TYPE.NO_PERMISSIONS);
  }

  const invalidRoles = [ROLE.INVALID, ROLE.NONE];
  const detectedRole = Object.values(ROLE)
    .filter(role => !invalidRoles.includes(role))
    .find(role => hasPermissionForRole(permissions.self, role));

  return detectedRole || ROLE.INVALID;
}

/**
 * Will generate a bunch of helper functions that can be consumed to know what features this role has access to.
 * The function generated will have the following format:
 *   can<camel cased feature name>: () => boolean
 *
 * @param {ROLE} boundRole - Default role that will be used by default in every helper. Can be overriden by passing a role when calling the helper
 * @returns {Object<Function>} helpers
 */
export function generatePermissionHelpers(boundRole = ROLE.NONE) {
  return Object.entries(FEATURES).reduce((helpers, [featureKey, featureValue]) => {
    const camelCasedFeature = featureKey
      .toLowerCase()
      .split('_')
      .map(stringUtil.capitalizeFirstChar)
      .join('');
    return Object.assign(helpers, {
      [`can${camelCasedFeature}`]: (role = boundRole) => hasAccessToFeature(featureValue, role),
    });
  }, {});
}

export function hasAccessToFeature(feature, role) {
  const permissions = combinePermissions([teamPermissionsForRole(role), publicPermissionsForRole(role)]);
  return !!(feature & permissions);
}

function combinePermissions(permissions) {
  return permissions.reduce((acc, permission) => acc | permission, 0);
}

function hasPermissions(memberPermissions, expectedPermissions) {
  return Number.isSafeInteger(memberPermissions) && (memberPermissions & expectedPermissions) === expectedPermissions;
}

function hasPermissionForRole(memberPermissions, role) {
  const rolePermissions = teamPermissionsForRole(role);
  return hasPermissions(memberPermissions, rolePermissions);
}
