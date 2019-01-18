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
/**
 * Enum for different team permissions.
 * @returns {z.team.TeamPermission.PERMISSION} Enum of team permissions
 */
const PERMISSION = {
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
/* eslint-enable sort-keys */

function permissionsForRole(teamRole) {
  switch (teamRole) {
    case ROLE.OWNER: {
      return combinePermissions([
        permissionsForRole(ROLE.ADMIN),
        PERMISSION.DELETE_TEAM,
        PERMISSION.GET_BILLING,
        PERMISSION.SET_BILLING,
      ]);
    }
    case ROLE.ADMIN: {
      return combinePermissions([
        permissionsForRole(ROLE.MEMBER),
        PERMISSION.ADD_TEAM_MEMBER,
        PERMISSION.REMOVE_TEAM_MEMBER,
        PERMISSION.SET_MEMBER_PERMISSIONS,
        PERMISSION.SET_TEAM_DATA,
      ]);
    }
    case ROLE.MEMBER: {
      return combinePermissions([
        permissionsForRole(ROLE.COLLABORATOR),
        PERMISSION.ADD_CONVERSATION_MEMBER,
        PERMISSION.DELETE_CONVERSATION,
        PERMISSION.GET_MEMBER_PERMISSIONS,
        PERMISSION.REMOVE_CONVERSATION_MEMBER,
      ]);
    }
    case ROLE.COLLABORATOR: {
      return combinePermissions([PERMISSION.CREATE_CONVERSATION, PERMISSION.GET_TEAM_CONVERSATIONS]);
    }
    default: {
      return 0;
    }
  }
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

export function roleFromPermissions(permissions) {
  if (!permissions) {
    throw new z.error.TeamError(z.error.TeamError.TYPE.NO_PERMISSIONS);
  }

  const invalidRoles = [ROLE.INVALID, ROLE.NONE];
  const detectedRole = Object.values(ROLE)
    .filter(role => !invalidRoles.includes(role))
    .reduce((foundRole, role) => {
      if (foundRole) {
        return foundRole;
      }
      return hasPermissionForRole(permissions.self, role) ? role : undefined;
    }, undefined);

  return detectedRole || ROLE.INVALID;
}

function combinePermissions(permissions) {
  return permissions.reduce((acc, permission) => acc | permission, 0);
}

function hasPermissions(memberPermissions, expectedPermissions) {
  return Number.isSafeInteger(memberPermissions) && (memberPermissions & expectedPermissions) === expectedPermissions;
}

function hasPermissionForRole(memberPermissions, role) {
  const rolePermissions = permissionsForRole(role);
  return hasPermissions(memberPermissions, rolePermissions);
}
