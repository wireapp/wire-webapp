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

/* eslint-disable sort-keys */
let bitsCounter = 0;

/**
 * Enum for different team permissions.
 * @returns {z.team.TeamPermission.TEAM_FEATURES} Enum of team permissions
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
/* eslint-enable sort-keys */

const PUBLIC_FEATURES = {
  CREATE_GROUP_CONVERSATION: 1 << bitsCounter++,
};

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
        teamPermissionsForRole(ROLE.COLLABORATOR),
        TEAM_FEATURES.ADD_CONVERSATION_MEMBER,
        TEAM_FEATURES.DELETE_CONVERSATION,
        TEAM_FEATURES.GET_MEMBER_PERMISSIONS,
        TEAM_FEATURES.REMOVE_CONVERSATION_MEMBER,
      ]);
    }
    case ROLE.COLLABORATOR: {
      return combinePermissions([TEAM_FEATURES.CREATE_CONVERSATION, TEAM_FEATURES.GET_TEAM_CONVERSATIONS]);
    }
    default: {
      return 0;
    }
  }
}

function permissionsForRole(role) {
  const teamPermissions = teamPermissionsForRole(role);

  switch (role) {
    case ROLE.ADMIN:
    case ROLE.OWNER:
    case ROLE.MEMBER:
    case ROLE.NONE:
      return combinePermissions([teamPermissions, PUBLIC_FEATURES.CREATE_GROUP_CONVERSATION]);
  }

  return teamPermissions;
}

/* eslint-disable sort-keys */
/**
 * Object descibing all the roles of a team member
 * This object need to be sorted from the highest priorities to the lowest
 */
export const ROLE = {
  OWNER: 'z.team.TeamRole.ROLE.OWNER',
  ADMIN: 'z.team.TeamRole.ROLE.ADMIN',
  MEMBER: 'z.team.TeamRole.ROLE.MEMBER',
  COLLABORATOR: 'z.team.TeamRole.ROLE.COLLABORATOR',
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

export function hasAccessToFeature(feature, role) {
  const permissions = permissionsForRole(role);
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
