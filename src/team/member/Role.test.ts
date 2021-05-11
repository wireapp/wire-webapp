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

import {Permissions, combinePermissions} from './Permissions';
import {PermissionsData} from './PermissionsData';
import {
  Role,
  isAdmin,
  isAtLeastAdmin,
  isAtLeastMember,
  isAtLeastPartner,
  isMember,
  isOwner,
  isPartner,
  roleToPermissions,
} from './Role';

describe('Role', () => {
  describe('hasPermissions', () => {
    it('INVALID', () => {
      const permissions = roleToPermissions('INVALID');
      expect(permissions).toEqual(combinePermissions([]));
    });

    it('MEMBER', () => {
      const permissions = roleToPermissions(Role.MEMBER);
      expect(permissions).toEqual(
        combinePermissions([
          Permissions.ADD_CONVERSATION_MEMBER,
          Permissions.CREATE_CONVERSATION,
          Permissions.DELETE_CONVERSATION,
          Permissions.GET_MEMBER_PERMISSIONS,
          Permissions.GET_TEAM_CONVERSATIONS,
          Permissions.REMOVE_CONVERSATION_MEMBER,
        ]),
      );
    });

    it('ADMIN', () => {
      const permissions = roleToPermissions(Role.ADMIN);
      expect(permissions).toEqual(
        combinePermissions([
          Permissions.ADD_CONVERSATION_MEMBER,
          Permissions.ADD_TEAM_MEMBER,
          Permissions.CREATE_CONVERSATION,
          Permissions.DELETE_CONVERSATION,
          Permissions.GET_MEMBER_PERMISSIONS,
          Permissions.GET_TEAM_CONVERSATIONS,
          Permissions.REMOVE_CONVERSATION_MEMBER,
          Permissions.REMOVE_TEAM_MEMBER,
          Permissions.SET_MEMBER_PERMISSIONS,
          Permissions.SET_TEAM_DATA,
        ]),
      );
    });

    it('OWNER', () => {
      const permissions = roleToPermissions(Role.OWNER);
      expect(permissions).toEqual(
        combinePermissions([
          Permissions.ADD_CONVERSATION_MEMBER,
          Permissions.ADD_TEAM_MEMBER,
          Permissions.CREATE_CONVERSATION,
          Permissions.DELETE_CONVERSATION,
          Permissions.DELETE_TEAM,
          Permissions.GET_BILLING,
          Permissions.GET_MEMBER_PERMISSIONS,
          Permissions.GET_TEAM_CONVERSATIONS,
          Permissions.REMOVE_CONVERSATION_MEMBER,
          Permissions.REMOVE_TEAM_MEMBER,
          Permissions.SET_BILLING,
          Permissions.SET_MEMBER_PERMISSIONS,
          Permissions.SET_TEAM_DATA,
        ]),
      );
    });
  });

  describe('isPartner', () => {
    it('OWNER is false', () => {
      expect(isPartner({copy: 0, self: roleToPermissions(Role.OWNER)})).toBe(false);
    });

    it('ADMIN is false', () => {
      expect(isPartner({copy: 0, self: roleToPermissions(Role.ADMIN)})).toBe(false);
    });

    it('MEMBER is false', () => {
      expect(isPartner({copy: 0, self: roleToPermissions(Role.MEMBER)})).toBe(false);
    });

    it('EXTERNAL is true', () => {
      expect(isPartner({copy: 0, self: roleToPermissions(Role.EXTERNAL)})).toBe(true);
    });

    it('invalid is false', () => {
      expect(isPartner({copy: 0, self: roleToPermissions('invalid')})).toBe(false);
    });

    it('0 is false', () => {
      expect(isPartner({copy: 0, self: 0})).toBe(false);
    });

    it('-1 is false', () => {
      expect(isPartner({copy: 0, self: -1})).toBe(false);
    });

    it('string is false', () => {
      expect(isPartner({copy: 0, self: 'MEMBER'} as unknown as PermissionsData)).toBe(false);
    });

    it('empty permissionsData is false', () => {
      expect(isPartner({} as unknown as PermissionsData)).toBe(false);
    });

    it('undefined permissionsData is false', () => {
      expect(isPartner(undefined as unknown as PermissionsData)).toBe(false);
    });
  });

  describe('isMember', () => {
    it('OWNER is false', () => {
      expect(isMember({copy: 0, self: roleToPermissions(Role.OWNER)})).toBe(false);
    });

    it('ADMIN is false', () => {
      expect(isMember({copy: 0, self: roleToPermissions(Role.ADMIN)})).toBe(false);
    });

    it('MEMBER is true', () => {
      expect(isMember({copy: 0, self: roleToPermissions(Role.MEMBER)})).toBe(true);
    });

    it('EXTERNAL is false', () => {
      expect(isMember({copy: 0, self: roleToPermissions(Role.EXTERNAL)})).toBe(false);
    });

    it('invalid is false', () => {
      expect(isMember({copy: 0, self: roleToPermissions('invalid')})).toBe(false);
    });

    it('0 is false', () => {
      expect(isMember({copy: 0, self: 0})).toBe(false);
    });

    it('-1 is false', () => {
      expect(isMember({copy: 0, self: -1})).toBe(false);
    });

    it('string is false', () => {
      expect(isMember({copy: 0, self: 'MEMBER'} as unknown as PermissionsData)).toBe(false);
    });

    it('empty permissionsData is false', () => {
      expect(isMember({} as unknown as PermissionsData)).toBe(false);
    });

    it('undefined permissionsData is false', () => {
      expect(isMember(undefined as unknown as PermissionsData)).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('OWNER is false', () => {
      expect(isAdmin({copy: 0, self: roleToPermissions(Role.OWNER)})).toBe(false);
    });

    it('ADMIN is true', () => {
      expect(isAdmin({copy: 0, self: roleToPermissions(Role.ADMIN)})).toBe(true);
    });

    it('MEMBER is false', () => {
      expect(isAdmin({copy: 0, self: roleToPermissions(Role.MEMBER)})).toBe(false);
    });

    it('EXTERNAL is false', () => {
      expect(isAdmin({copy: 0, self: roleToPermissions(Role.EXTERNAL)})).toBe(false);
    });

    it('invalid is false', () => {
      expect(isAdmin({copy: 0, self: roleToPermissions('invalid')})).toBe(false);
    });

    it('0 is false', () => {
      expect(isAdmin({copy: 0, self: 0})).toBe(false);
    });

    it('-1 is false', () => {
      expect(isAdmin({copy: 0, self: -1})).toBe(false);
    });

    it('string is false', () => {
      expect(isAdmin({copy: 0, self: 'ADMIN'} as unknown as PermissionsData)).toBe(false);
    });

    it('empty permissionsData is false', () => {
      expect(isAdmin({} as unknown as PermissionsData)).toBe(false);
    });

    it('undefined permissionsData is false', () => {
      expect(isAdmin(undefined as unknown as PermissionsData)).toBe(false);
    });
  });

  describe('isOwner', () => {
    it('OWNER is true', () => {
      expect(isOwner({copy: 0, self: roleToPermissions(Role.OWNER)})).toBe(true);
    });

    it('ADMIN is false', () => {
      expect(isOwner({copy: 0, self: roleToPermissions(Role.ADMIN)})).toBe(false);
    });

    it('MEMBER is false', () => {
      expect(isOwner({copy: 0, self: roleToPermissions(Role.MEMBER)})).toBe(false);
    });

    it('EXTERNAL is false', () => {
      expect(isOwner({copy: 0, self: roleToPermissions(Role.EXTERNAL)})).toBe(false);
    });

    it('invalid is false', () => {
      expect(isOwner({copy: 0, self: roleToPermissions('invalid')})).toBe(false);
    });

    it('0 is false', () => {
      expect(isOwner({copy: 0, self: 0})).toBe(false);
    });

    it('-1 is false', () => {
      expect(isOwner({copy: 0, self: -1})).toBe(false);
    });

    it('string is false', () => {
      expect(isOwner({copy: 0, self: 'OWNER'} as unknown as PermissionsData)).toBe(false);
    });

    it('empty permissionsData is false', () => {
      expect(isOwner({} as unknown as PermissionsData)).toBe(false);
    });

    it('undefined permissionsData is false', () => {
      expect(isOwner(undefined as unknown as PermissionsData)).toBe(false);
    });
  });

  describe('isAtLeastPartner', () => {
    it('OWNER is true', () => {
      expect(isAtLeastPartner({copy: 0, self: roleToPermissions(Role.OWNER)})).toBe(true);
    });

    it('ADMIN is true', () => {
      expect(isAtLeastPartner({copy: 0, self: roleToPermissions(Role.ADMIN)})).toBe(true);
    });

    it('MEMBER is true', () => {
      expect(isAtLeastPartner({copy: 0, self: roleToPermissions(Role.MEMBER)})).toBe(true);
    });

    it('EXTERNAL is true', () => {
      expect(isAtLeastPartner({copy: 0, self: roleToPermissions(Role.EXTERNAL)})).toBe(true);
    });

    it('invalid is false', () => {
      expect(isAtLeastPartner({copy: 0, self: roleToPermissions('invalid')})).toBe(false);
    });

    it('Unknown above is false', () => {
      expect(isAtLeastPartner({copy: 0, self: roleToPermissions(Role.EXTERNAL) + 1234})).toBe(false);
    });

    it('0 is false', () => {
      expect(isAtLeastPartner({copy: 0, self: 0})).toBe(false);
    });

    it('-1 is false', () => {
      expect(isAtLeastPartner({copy: 0, self: -1})).toBe(false);
    });

    it('string is false', () => {
      expect(isAtLeastPartner({copy: 0, self: 'OWNER'} as unknown as PermissionsData)).toBe(false);
    });

    it('empty permissionsData is false', () => {
      expect(isAtLeastPartner({} as unknown as PermissionsData)).toBe(false);
    });

    it('undefined permissionsData is false', () => {
      expect(isAtLeastPartner(undefined as unknown as PermissionsData)).toBe(false);
    });
  });

  describe('isAtLeastMember', () => {
    it('OWNER is true', () => {
      expect(isAtLeastMember({copy: 0, self: roleToPermissions(Role.OWNER)})).toBe(true);
    });

    it('ADMIN is true', () => {
      expect(isAtLeastMember({copy: 0, self: roleToPermissions(Role.ADMIN)})).toBe(true);
    });

    it('MEMBER is true', () => {
      expect(isAtLeastMember({copy: 0, self: roleToPermissions(Role.MEMBER)})).toBe(true);
    });

    it('EXTERNAL is false', () => {
      expect(isAtLeastMember({copy: 0, self: roleToPermissions(Role.EXTERNAL)})).toBe(false);
    });

    it('invalid is false', () => {
      expect(isAtLeastMember({copy: 0, self: roleToPermissions('invalid')})).toBe(false);
    });

    it('Unknown above is false', () => {
      expect(isAtLeastMember({copy: 0, self: roleToPermissions(Role.MEMBER) + 1234})).toBe(false);
    });

    it('0 is false', () => {
      expect(isAtLeastMember({copy: 0, self: 0})).toBe(false);
    });

    it('-1 is false', () => {
      expect(isAtLeastMember({copy: 0, self: -1})).toBe(false);
    });

    it('string is false', () => {
      expect(isAtLeastMember({copy: 0, self: 'OWNER'} as unknown as PermissionsData)).toBe(false);
    });

    it('empty permissionsData is false', () => {
      expect(isAtLeastMember({} as unknown as PermissionsData)).toBe(false);
    });

    it('undefined permissionsData is false', () => {
      expect(isAtLeastMember(undefined as unknown as PermissionsData)).toBe(false);
    });
  });

  describe('isAtLeastAdmin', () => {
    it('OWNER is true', () => {
      expect(isAtLeastAdmin({copy: 0, self: roleToPermissions(Role.OWNER)})).toBe(true);
    });

    it('ADMIN is true', () => {
      expect(isAtLeastAdmin({copy: 0, self: roleToPermissions(Role.ADMIN)})).toBe(true);
    });

    it('MEMBER is false', () => {
      expect(isAtLeastAdmin({copy: 0, self: roleToPermissions(Role.MEMBER)})).toBe(false);
    });

    it('EXTERNAL is false', () => {
      expect(isAtLeastAdmin({copy: 0, self: roleToPermissions(Role.EXTERNAL)})).toBe(false);
    });

    it('invalid is false', () => {
      expect(isAtLeastAdmin({copy: 0, self: roleToPermissions('invalid')})).toBe(false);
    });

    it('Unknown above is false', () => {
      expect(isAtLeastAdmin({copy: 0, self: roleToPermissions(Role.ADMIN) + 1234})).toBe(false);
    });

    it('0 is false', () => {
      expect(isAtLeastAdmin({copy: 0, self: 0})).toBe(false);
    });

    it('-1 is false', () => {
      expect(isAtLeastAdmin({copy: 0, self: -1})).toBe(false);
    });

    it('string is false', () => {
      expect(isAtLeastAdmin({copy: 0, self: 'OWNER'} as unknown as PermissionsData)).toBe(false);
    });

    it('empty permissionsData is false', () => {
      expect(isAtLeastAdmin({} as unknown as PermissionsData)).toBe(false);
    });

    it('undefined permissionsData is false', () => {
      expect(isAtLeastAdmin(undefined as unknown as PermissionsData)).toBe(false);
    });
  });
});
