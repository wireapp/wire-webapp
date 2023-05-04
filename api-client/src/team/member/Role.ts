/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {Permissions, combinePermissions, hasPermissions} from './Permissions';
import {PermissionsData} from './PermissionsData';

export enum Role {
  ADMIN = 'admin',
  EXTERNAL = 'partner',
  MEMBER = 'member',
  OWNER = 'owner',
  NONE = 'none',
}

export const roleToPermissions = (role: string): Permissions => {
  switch (role.toLowerCase()) {
    case Role.OWNER: {
      return combinePermissions([
        roleToPermissions(Role.ADMIN),
        Permissions.DELETE_TEAM,
        Permissions.GET_BILLING,
        Permissions.SET_BILLING,
      ]);
    }
    case Role.ADMIN: {
      return combinePermissions([
        roleToPermissions(Role.MEMBER),
        Permissions.ADD_TEAM_MEMBER,
        Permissions.REMOVE_TEAM_MEMBER,
        Permissions.SET_MEMBER_PERMISSIONS,
        Permissions.SET_TEAM_DATA,
      ]);
    }
    case Role.MEMBER: {
      return combinePermissions([
        roleToPermissions(Role.EXTERNAL),
        Permissions.ADD_CONVERSATION_MEMBER,
        Permissions.DELETE_CONVERSATION,
        Permissions.GET_MEMBER_PERMISSIONS,
        Permissions.REMOVE_CONVERSATION_MEMBER,
      ]);
    }
    case Role.EXTERNAL: {
      return combinePermissions([Permissions.CREATE_CONVERSATION, Permissions.GET_TEAM_CONVERSATIONS]);
    }
    default: {
      return Permissions.DEFAULT;
    }
  }
};

export const permissionsToRole = (permissions: PermissionsData): Role | undefined => {
  if (hasPermissions(permissions.self, roleToPermissions(Role.OWNER))) {
    return Role.OWNER;
  }
  if (hasPermissions(permissions.self, roleToPermissions(Role.ADMIN))) {
    return Role.ADMIN;
  }
  if (hasPermissions(permissions.self, roleToPermissions(Role.MEMBER))) {
    return Role.MEMBER;
  }
  if (hasPermissions(permissions.self, roleToPermissions(Role.EXTERNAL))) {
    return Role.EXTERNAL;
  }
  return undefined;
};

export const isPartner = (permissions: PermissionsData): boolean => {
  return !!(permissions && permissionsToRole(permissions) === Role.EXTERNAL);
};

export const isMember = (permissions: PermissionsData): boolean => {
  return !!(permissions && permissionsToRole(permissions) === Role.MEMBER);
};

export const isAdmin = (permissions: PermissionsData): boolean => {
  return !!(permissions && permissionsToRole(permissions) === Role.ADMIN);
};

export const isOwner = (permissions: PermissionsData): boolean => {
  return !!(permissions && permissionsToRole(permissions) === Role.OWNER);
};

export const isAtLeastPartner = (permissions: PermissionsData): boolean => {
  return isPartner(permissions) || isMember(permissions) || isAdmin(permissions) || isOwner(permissions);
};

export const isAtLeastMember = (permissions: PermissionsData): boolean => {
  return isMember(permissions) || isAdmin(permissions) || isOwner(permissions);
};

export const isAtLeastAdmin = (permissions: PermissionsData): boolean => {
  return isAdmin(permissions) || isOwner(permissions);
};

export const isAtLeastEqual = (permissions: PermissionsData, otherPermissions: PermissionsData): boolean => {
  return (
    (isOwner(permissions) && isOwner(otherPermissions)) ||
    (isAtLeastAdmin(permissions) && isAdmin(otherPermissions)) ||
    (isAtLeastMember(permissions) && isMember(otherPermissions)) ||
    (isAtLeastPartner(permissions) && isPartner(otherPermissions))
  );
};
