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

import {ROLE, roleFromPermissions} from 'src/script/team/TeamPermission';

const collaboratorPermissionBitmask = 0b10000000001;
const memberPermissionBitmask = 0b11000110011;
const ownerPermissionBitmask = 0b1111111111111;
const adminPermissionBitmask = 0b1011100111111;

describe('TeamPermission', () => {
  describe('roleFromPermissions', () => {
    it('throws an error if the permissions are not given', () => {
      expect(() => roleFromPermissions()).toThrow();
    });

    it('extracts a role from the given permissions', () => {
      const tests = [
        {expected: ROLE.COLLABORATOR, permission: collaboratorPermissionBitmask},
        {expected: ROLE.MEMBER, permission: memberPermissionBitmask},
        {expected: ROLE.OWNER, permission: ownerPermissionBitmask},
        {expected: ROLE.ADMIN, permission: adminPermissionBitmask},
        {expected: ROLE.INVALID, permission: 0},
      ];

      tests.forEach(({expected, permission}) => {
        const role = roleFromPermissions({copy: permission, self: permission});

        expect(role).toBe(expected);
      });
    });
  });
});
