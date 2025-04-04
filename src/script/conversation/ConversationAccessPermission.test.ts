/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {CONVERSATION_ACCESS, CONVERSATION_ACCESS_ROLE} from '@wireapp/api-client/lib/conversation/';

import {ACCESS_STATE, TEAM} from './AccessState';
import {
  accessFromPermissions,
  ACCESS_MODES,
  ACCESS_TYPES,
  featureFromStateChange,
  hasAccessToFeature,
  isGettingAccessToFeature,
  teamPermissionsForAccessState,
  toggleFeature,
  updateAccessRights,
  UpdatedAccessRights,
} from './ConversationAccessPermission';

describe('ConversationAccessPermissions', () => {
  const mockTeam = {
    GUESTS_SERVICES:
      ACCESS_TYPES.GUEST |
      ACCESS_TYPES.NON_TEAM_MEMBER |
      ACCESS_MODES.CODE |
      ACCESS_MODES.INVITE |
      ACCESS_TYPES.TEAM_MEMBER |
      ACCESS_TYPES.SERVICE,
    GUEST_ROOM:
      ACCESS_TYPES.GUEST |
      ACCESS_TYPES.NON_TEAM_MEMBER |
      ACCESS_MODES.CODE |
      ACCESS_MODES.INVITE |
      ACCESS_TYPES.TEAM_MEMBER,
    SERVICES: ACCESS_MODES.INVITE | ACCESS_TYPES.TEAM_MEMBER | ACCESS_TYPES.SERVICE,
    TEAM_ONLY: ACCESS_MODES.INVITE | ACCESS_TYPES.TEAM_MEMBER,
    LEGACY: 0,
    GUEST_FEATURES: ACCESS_TYPES.GUEST | ACCESS_TYPES.NON_TEAM_MEMBER | ACCESS_MODES.CODE,
    ONE2ONE: 0,
    PUBLIC: ACCESS_MODES.INVITE | ACCESS_TYPES.TEAM_MEMBER | ACCESS_MODES.LINK,
    PUBLIC_GUESTS:
      ACCESS_MODES.INVITE |
      ACCESS_TYPES.TEAM_MEMBER |
      ACCESS_TYPES.GUEST |
      ACCESS_MODES.CODE |
      ACCESS_TYPES.NON_TEAM_MEMBER |
      ACCESS_MODES.LINK,
  };

  const accessStateMapper = <V>(teamObject: {[state in keyof typeof ACCESS_STATE.TEAM]: V}): [TEAM, V][] =>
    Object.entries(teamObject).map(([state, value]) => [
      ACCESS_STATE.TEAM[state as keyof typeof ACCESS_STATE.TEAM],
      value,
    ]);

  const mockAccessTeam = accessStateMapper(mockTeam);

  describe('teamPermissionsForAccessState', () => {
    it.each(mockAccessTeam)('should return the features for %s', (accessState, results) => {
      expect(
        teamPermissionsForAccessState(accessState as (typeof ACCESS_STATE.TEAM)[keyof typeof ACCESS_STATE.TEAM]),
      ).toBe(results);
    });

    it('should return 0 if an unknown value is passed to it', () => {
      expect(teamPermissionsForAccessState(ACCESS_STATE.OTHER.SELF)).toBe(0);
    });
  });

  describe('hasAccessToFeature & toggleFeature', () => {
    it.each(mockAccessTeam.slice(0, -5))('%s has correct features and can toggle', state => {
      const features = [ACCESS_TYPES.SERVICE, ACCESS_TYPES.GUEST | ACCESS_TYPES.NON_TEAM_MEMBER | ACCESS_MODES.CODE];
      features.forEach(feature =>
        // toggling the feature should mean the current access state no longer has access to it.
        expect(hasAccessToFeature(feature, state)).not.toEqual(
          hasAccessToFeature(feature, toggleFeature(feature, state)),
        ),
      );
    });
  });

  describe('isGettingAccessToFeature', () => {
    it('Correctly loses feature', () => {
      expect(
        isGettingAccessToFeature(ACCESS_TYPES.GUEST, ACCESS_STATE.TEAM.GUEST_ROOM, ACCESS_STATE.TEAM.TEAM_ONLY),
      ).toBeFalsy();
    });
    it('Correctly gains feature', () => {
      expect(
        isGettingAccessToFeature(ACCESS_TYPES.SERVICE, ACCESS_STATE.TEAM.TEAM_ONLY, ACCESS_STATE.TEAM.SERVICES),
      ).toBeTruthy();
    });
    it('Correctly remains the same', () => {
      expect(
        isGettingAccessToFeature(ACCESS_TYPES.SERVICE, ACCESS_STATE.TEAM.TEAM_ONLY, ACCESS_STATE.TEAM.TEAM_ONLY),
      ).toBeFalsy();
    });
  });

  describe('featureFromStateChange', () => {
    it.each(mockAccessTeam.slice(0, -5))('gives feature information for %s', (prev, feat) => {
      mockAccessTeam.slice(0, -5).forEach(([team]) => {
        const result = featureFromStateChange(prev, team);

        if (prev === team) {
          // eslint-disable-next-line jest/no-conditional-expect
          return Object.values(result).forEach(value => expect(value).toBeFalsy());
        }
        expect(['guest', 'service']).toContain(result.feature);
        expect(['Guest', 'Service']).toContain(result.featureName);
        // compared to the original, feature should be falsy (opposite state)
        expect(result.isAvailable === !!(feat & result.bitmask)).toBeFalsy();
      });
    });
  });

  describe('accessFromPermissions', () => {
    it.each(mockAccessTeam.slice(0, -4))('gives %s for %d', (team, permissions) => {
      expect(accessFromPermissions(permissions)).toBe(team);
    });
    it('gives z.conversation.ACCESS_STATE.TEAM.LEGACY for unknown permissions', () => {
      expect(accessFromPermissions(mockAccessTeam[5][1])).toBe(ACCESS_STATE.TEAM.LEGACY);
    });
  });

  describe('updateAccessRights', () => {
    const mockRights = {
      GUESTS_SERVICES: {
        accessRole: [
          CONVERSATION_ACCESS_ROLE.GUEST,
          CONVERSATION_ACCESS_ROLE.NON_TEAM_MEMBER,
          CONVERSATION_ACCESS_ROLE.TEAM_MEMBER,
          CONVERSATION_ACCESS_ROLE.SERVICE,
        ],
        accessModes: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE],
      },
      GUEST_ROOM: {
        accessRole: [
          CONVERSATION_ACCESS_ROLE.GUEST,
          CONVERSATION_ACCESS_ROLE.NON_TEAM_MEMBER,
          CONVERSATION_ACCESS_ROLE.TEAM_MEMBER,
        ],
        accessModes: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE],
      },
      SERVICES: {
        accessModes: [CONVERSATION_ACCESS.INVITE],
        accessRole: [CONVERSATION_ACCESS_ROLE.TEAM_MEMBER, CONVERSATION_ACCESS_ROLE.SERVICE],
      },
      TEAM_ONLY: {accessModes: [CONVERSATION_ACCESS.INVITE], accessRole: [CONVERSATION_ACCESS_ROLE.TEAM_MEMBER]},
      LEGACY: {accessModes: [], accessRole: []} as UpdatedAccessRights,
      GUEST_FEATURES: {
        accessRole: [CONVERSATION_ACCESS_ROLE.GUEST, CONVERSATION_ACCESS_ROLE.NON_TEAM_MEMBER],
        accessModes: [CONVERSATION_ACCESS.CODE],
      },
      ONE2ONE: {accessModes: [], accessRole: []} as UpdatedAccessRights,
      PUBLIC: {
        accessModes: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.LINK],
        accessRole: [CONVERSATION_ACCESS_ROLE.TEAM_MEMBER],
      },
      PUBLIC_GUESTS: {
        accessModes: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE, CONVERSATION_ACCESS.LINK],
        accessRole: [
          CONVERSATION_ACCESS_ROLE.GUEST,
          CONVERSATION_ACCESS_ROLE.NON_TEAM_MEMBER,
          CONVERSATION_ACCESS_ROLE.TEAM_MEMBER,
        ],
      },
    };

    const mockAccessRights = accessStateMapper(mockRights);

    it.each(mockAccessRights)('returns rights array for %s', (state, rights) => {
      expect(updateAccessRights(state)).toStrictEqual(rights);
    });
  });
});
