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

/* eslint-disable sort-keys-fix/sort-keys-fix */
import {ACCESS_STATE, TEAM} from './AccessState';
import {
  ACCESS,
  ACCESS_MODES,
  ACCESS_TYPES,
  featureFromStateChange,
  hasAccessToFeature,
  isGettingAccessToFeature,
  // ACCESS_MODES,
  // featureFromStateChange,
  // isGettingAccessToFeature,
  teamPermissionsForAccessState,
  // updateAccessRights,
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
  };
  const entry: [TEAM, number][] = Object.entries(mockTeam).map(([k, v]) => [
    ACCESS_STATE.TEAM[k as keyof typeof ACCESS_STATE.TEAM],
    v,
  ]);
  describe('teamPermissionsForAccessState', () => {
    it.each(entry)('should return the features for %s', (accessState, results) => {
      expect(
        teamPermissionsForAccessState(accessState as typeof ACCESS_STATE.TEAM[keyof typeof ACCESS_STATE.TEAM]),
      ).toBe(results);
    });

    it('should return 0 if an unknown value is passed to it', () => {
      expect(teamPermissionsForAccessState(ACCESS_STATE.OTHER.SELF)).toBe(0);
    });
  });

  describe('hasAccessToFeature', () => {
    it.each(entry)('%s has access to the correct features', (state, results) => {
      Object.values(ACCESS).forEach(feature =>
        expect(hasAccessToFeature(feature, state) === !!(results & feature)).toBeTruthy(),
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
    it.each(entry.slice(0, -3))('gives feature information for %s', (prev, feat) => {
      entry.slice(0, -3).forEach(([team]) => {
        const result = featureFromStateChange(prev, team);
        if (prev === team) {
          // eslint-disable-next-line jest/no-conditional-expect
          return Object.values(result).forEach(value => expect(value).toBeFalsy());
        }
        expect(['guest', 'service']).toContain(result.feature);
        expect(['Guest', 'Service']).toContain(result.featureName);
        expect(result.isAvailable === !!(feat & result.number)).toBeFalsy();
      });
    });
  });
});
