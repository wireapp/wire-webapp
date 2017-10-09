/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

window.z = window.z || {};
window.z.team = z.team || {};


z.team.TeamPermission = (() => {

  const _permissions_for_role = (team_role) => {
    switch (team_role) {
      case z.team.TeamRole.ROLE.OWNER: {
        return _combine_permissions([
          _permissions_for_role(z.team.TeamRole.ROLE.ADMIN),
          PERMISSION.DELETE_TEAM,
          PERMISSION.GET_BILLING,
          PERMISSION.SET_BILLING,
        ]);
      }
      case z.team.TeamRole.ROLE.ADMIN: {
        return _combine_permissions([
          _permissions_for_role(z.team.TeamRole.ROLE.MEMBER),
          PERMISSION.ADD_TEAM_MEMBER,
          PERMISSION.REMOVE_TEAM_MEMBER,
          PERMISSION.SET_MEMBER_PERMISSIONS,
          PERMISSION.SET_TEAM_DATA,
        ]);
      }
      case z.team.TeamRole.ROLE.MEMBER: {
        return _combine_permissions([
          PERMISSION.ADD_CONVERSATION_MEMBER,
          PERMISSION.CREATE_CONVERSATION,
          PERMISSION.DELETE_CONVERSATION,
          PERMISSION.GET_MEMBER_PERMISSIONS,
          PERMISSION.GET_TEAM_CONVERSATIONS,
          PERMISSION.REMOVE_CONVERSATION_MEMBER,
        ]);
      }
      default: {
        return 0;
      }
    }
  };

  const _combine_permissions = (permissions) => {
    let result = 0;
    for (const permission of permissions) {
      result = result | permission;
    }
    return result;
  };

  const _has_permission = (member_permissions, role) => {
    const role_permissions = _permissions_for_role(role);
    console.log('Expected', role_permissions, 'Found', member_permissions);
    if (Number.isSafeInteger(member_permissions) && member_permissions > 0) {
      return (member_permissions & role_permissions) === role_permissions;
    }
    return false;
  };

  /**
   * Enum for different team permissions.
   * @returns {z.team.TeamPermission.PERMISSION} Enum of team permissions
   */
  const PERMISSION = {
    ADD_CONVERSATION_MEMBER: 1 << 4,
    ADD_TEAM_MEMBER: 1 << 2,
    CREATE_CONVERSATION: 1 << 0,
    DELETE_CONVERSATION: 1 << 1,
    DELETE_TEAM: 1 << 11,
    GET_BILLING: 1 << 6,
    GET_MEMBER_PERMISSIONS: 1 << 9,
    GET_TEAM_CONVERSATIONS: 1 << 10,
    NONE: 0,
    REMOVE_CONVERSATION_MEMBER: 1 << 5,
    REMOVE_TEAM_MEMBER: 1 << 3,
    SET_BILLING: 1 << 7,
    SET_MEMBER_PERMISSIONS: 1 << 12,
    SET_TEAM_DATA: 1 << 8,
  };

  return {
    PERMISSION: PERMISSION,
    has_permission: _has_permission,
  };
})();
