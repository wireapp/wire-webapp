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

import {Permissions, hasPermissions} from './Permissions';

describe('Permission', () => {
  describe('hasPermission true for', () => {
    it('CREATE_CONVERSATION and 1', () => expect(hasPermissions(1, Permissions.CREATE_CONVERSATION)).toBe(true));

    it('DELETE_CONVERSATION and 2', () => expect(hasPermissions(2, Permissions.DELETE_CONVERSATION)).toBe(true));

    it('ADD_TEAM_MEMBER and 4', () => expect(hasPermissions(4, Permissions.ADD_TEAM_MEMBER)).toBe(true));

    it('REMOVE_TEAM_MEMBER and 8', () => expect(hasPermissions(8, Permissions.REMOVE_TEAM_MEMBER)).toBe(true));

    it('ADD_CONVERSATION_MEMBER and 16', () =>
      expect(hasPermissions(16, Permissions.ADD_CONVERSATION_MEMBER)).toBe(true));

    it('REMOVE_CONVERSATION_MEMBER and 32', () =>
      expect(hasPermissions(32, Permissions.REMOVE_CONVERSATION_MEMBER)).toBe(true));

    it('GET_BILLING and 64', () => expect(hasPermissions(64, Permissions.GET_BILLING)).toBe(true));

    it('SET_BILLING and 128', () => expect(hasPermissions(128, Permissions.SET_BILLING)).toBe(true));

    it('SET_TEAM_DATA and 256', () => expect(hasPermissions(256, Permissions.SET_TEAM_DATA)).toBe(true));

    it('GET_MEMBER_PERMISSIONS and 512', () =>
      expect(hasPermissions(512, Permissions.GET_MEMBER_PERMISSIONS)).toBe(true));

    it('GET_TEAM_CONVERSATIONS and 1024', () =>
      expect(hasPermissions(1024, Permissions.GET_TEAM_CONVERSATIONS)).toBe(true));

    it('DELETE_TEAM and 2048', () => expect(hasPermissions(2048, Permissions.DELETE_TEAM)).toBe(true));

    it('SET_MEMBER_PERMISSIONS and 4096', () =>
      expect(hasPermissions(4096, Permissions.SET_MEMBER_PERMISSIONS)).toBe(true));
  });

  describe('hasPermission false for 0', () => {
    it('CREATE_CONVERSATION', () => expect(hasPermissions(0, Permissions.CREATE_CONVERSATION)).toBe(false));

    it('DELETE_CONVERSATION', () => expect(hasPermissions(0, Permissions.DELETE_CONVERSATION)).toBe(false));

    it('ADD_TEAM_MEMBER', () => expect(hasPermissions(0, Permissions.ADD_TEAM_MEMBER)).toBe(false));

    it('REMOVE_TEAM_MEMBER', () => expect(hasPermissions(0, Permissions.REMOVE_TEAM_MEMBER)).toBe(false));

    it('ADD_CONVERSATION_MEMBER', () => expect(hasPermissions(0, Permissions.ADD_CONVERSATION_MEMBER)).toBe(false));

    it('REMOVE_CONVERSATION_MEMBER', () =>
      expect(hasPermissions(0, Permissions.REMOVE_CONVERSATION_MEMBER)).toBe(false));

    it('GET_BILLING', () => expect(hasPermissions(0, Permissions.GET_BILLING)).toBe(false));

    it('SET_BILLING', () => expect(hasPermissions(0, Permissions.SET_BILLING)).toBe(false));

    it('SET_TEAM_DATA', () => expect(hasPermissions(0, Permissions.SET_TEAM_DATA)).toBe(false));

    it('GET_MEMBER_PERMISSIONS', () => expect(hasPermissions(0, Permissions.GET_MEMBER_PERMISSIONS)).toBe(false));

    it('GET_TEAM_CONVERSATIONS', () => expect(hasPermissions(0, Permissions.GET_TEAM_CONVERSATIONS)).toBe(false));

    it('DELETE_TEAM', () => expect(hasPermissions(0, Permissions.DELETE_TEAM)).toBe(false));

    it('SET_MEMBER_PERMISSIONS', () => expect(hasPermissions(0, Permissions.SET_MEMBER_PERMISSIONS)).toBe(false));
  });

  describe('hasPermission false for -1', () => {
    it('CREATE_CONVERSATION', () => expect(hasPermissions(-1, Permissions.CREATE_CONVERSATION)).toBe(false));

    it('DELETE_CONVERSATION', () => expect(hasPermissions(-1, Permissions.DELETE_CONVERSATION)).toBe(false));

    it('ADD_TEAM_MEMBER', () => expect(hasPermissions(-1, Permissions.ADD_TEAM_MEMBER)).toBe(false));

    it('REMOVE_TEAM_MEMBER', () => expect(hasPermissions(-1, Permissions.REMOVE_TEAM_MEMBER)).toBe(false));

    it('ADD_CONVERSATION_MEMBER', () => expect(hasPermissions(-1, Permissions.ADD_CONVERSATION_MEMBER)).toBe(false));

    it('REMOVE_CONVERSATION_MEMBER', () =>
      expect(hasPermissions(-1, Permissions.REMOVE_CONVERSATION_MEMBER)).toBe(false));

    it('GET_BILLING', () => expect(hasPermissions(-1, Permissions.GET_BILLING)).toBe(false));

    it('SET_BILLING', () => expect(hasPermissions(-1, Permissions.SET_BILLING)).toBe(false));

    it('SET_TEAM_DATA', () => expect(hasPermissions(-1, Permissions.SET_TEAM_DATA)).toBe(false));

    it('GET_MEMBER_PERMISSIONS', () => expect(hasPermissions(-1, Permissions.GET_MEMBER_PERMISSIONS)).toBe(false));

    it('GET_TEAM_CONVERSATIONS', () => expect(hasPermissions(-1, Permissions.GET_TEAM_CONVERSATIONS)).toBe(false));

    it('DELETE_TEAM', () => expect(hasPermissions(-1, Permissions.DELETE_TEAM)).toBe(false));

    it('SET_MEMBER_PERMISSIONS', () => expect(hasPermissions(-1, Permissions.SET_MEMBER_PERMISSIONS)).toBe(false));
  });
});
