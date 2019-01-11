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

window.z = window.z || {};
window.z.team = z.team || {};

z.team.TeamRole = (() => {
  const ROLE = {
    ADMIN: 'z.team.TeamRole.ROLE.ADMIN',
    INVALID: 'z.team.TeamRole.ROLE.INVALID',
    MEMBER: 'z.team.TeamRole.ROLE.MEMBER',
    NONE: 'z.team.TeamRole.ROLE.NONE',
    OWNER: 'z.team.TeamRole.ROLE.OWNER',
  };

  const _checkRole = permissions => {
    if (!permissions) {
      throw new z.error.TeamError(z.error.TeamError.TYPE.NO_PERMISSIONS);
    }

    if (z.team.TeamPermission.hasPermissionForRole(permissions.self, ROLE.OWNER)) {
      return ROLE.OWNER;
    }

    if (z.team.TeamPermission.hasPermissionForRole(permissions.self, ROLE.ADMIN)) {
      return ROLE.ADMIN;
    }

    if (z.team.TeamPermission.hasPermissionForRole(permissions.self, ROLE.MEMBER)) {
      return ROLE.MEMBER;
    }

    return ROLE.INVALID;
  };

  return {
    ROLE: ROLE,
    checkRole: _checkRole,
  };
})();
