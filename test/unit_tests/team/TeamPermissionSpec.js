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

const memberPermissionBitmask = 1587;
const ownerPermissionBitmask = 8191;
const adminPermissionBitmask = 0b1011100111111;

describe('TeamPermission', () => {
  describe('roleFromPermissions', () => {
    it('throws an error if the permissions are not given', () => {
      expect(() => roleFromPermissions()).toThrow();
    });

    it('extracts a role from the given permissions', () => {
      const tests = [
        {expected: ROLE.MEMBER, permission: {copy: memberPermissionBitmask, self: memberPermissionBitmask}},
        {expected: ROLE.OWNER, permission: {copy: ownerPermissionBitmask, self: ownerPermissionBitmask}},
        {expected: ROLE.ADMIN, permission: {copy: adminPermissionBitmask, self: adminPermissionBitmask}},
        {expected: ROLE.INVALID, permission: {copy: 0, self: 0}},
      ];

      tests.forEach(({expected, permission}) => {
        const role = roleFromPermissions(permission);

        expect(role).toBe(expected);
      });
    });
  });
});
