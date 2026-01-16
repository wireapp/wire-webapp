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

export enum Permissions {
  DEFAULT = 0,
  CREATE_CONVERSATION = 1 << 0,
  DELETE_CONVERSATION = 1 << 1,
  ADD_TEAM_MEMBER = 1 << 2,
  REMOVE_TEAM_MEMBER = 1 << 3,
  ADD_CONVERSATION_MEMBER = 1 << 4,
  REMOVE_CONVERSATION_MEMBER = 1 << 5,
  GET_BILLING = 1 << 6,
  SET_BILLING = 1 << 7,
  SET_TEAM_DATA = 1 << 8,
  GET_MEMBER_PERMISSIONS = 1 << 9,
  GET_TEAM_CONVERSATIONS = 1 << 10,
  DELETE_TEAM = 1 << 11,
  SET_MEMBER_PERMISSIONS = 1 << 12,
}

export const hasPermissions = (permissions: Permissions, expectedPermissions: Permissions): boolean => {
  const validPermissions = Number.isSafeInteger(permissions) && permissions > 0;
  return validPermissions && (permissions & expectedPermissions) === expectedPermissions;
};

export const combinePermissions = (permissionList: Permissions[]): Permissions => {
  return permissionList.reduce<number>((acc, permission) => acc | permission, 0);
};
